import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { annonceTest, json, pageTest, reponseConnexion, simulerApi, utilisateurTest } from '../test/apiSimulee'

const proprio = { ...utilisateurTest, role: 'PROPRIETAIRE' as const }

async function seConnecter(role: 'CLIENT' | 'PROPRIETAIRE', routes: Parameters<typeof simulerApi>[0], depart = '/connexion') {
  const api = simulerApi({
    'POST /api/auth/login': () => reponseConnexion(role === 'CLIENT' ? utilisateurTest : proprio),
    'GET /api/auth/me': () => json(200, role === 'CLIENT' ? utilisateurTest : proprio),
    ...routes,
  })
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[depart]}>
      <App />
    </MemoryRouter>,
  )
  await user.type(await screen.findByLabelText(/email/i), 'khady@example.test')
  await user.type(screen.getByLabelText(/mot de passe/i), 'MotDePasse123!')
  await user.click(screen.getByRole('button', { name: /se connecter/i }))
  if (depart === '/connexion') await screen.findByRole('heading', { name: /Bonjour/ })
  return { api, user }
}

afterEach(() => vi.unstubAllGlobals())

describe('Publication et gestion des annonces', () => {
  it("un compte Client voit un message clair et aucun formulaire", async () => {
    await seConnecter('CLIENT', {}, '/annonces/nouvelle')
    expect(await screen.findByRole('alert')).toHaveTextContent(/Propriétaire et Administrateur/)
    expect(screen.queryByRole('form', { name: /formulaire d'annonce/i })).not.toBeInTheDocument()
  })

  it("le propriétaire publie une annonce : le corps envoyé ne contient ni propriétaire ni statut", async () => {
    const { api, user } = await seConnecter(
      'PROPRIETAIRE',
      {
        'POST /api/annonces': () => json(201, annonceTest()),
        [`GET /api/annonces/${annonceTest().id}`]: () => json(200, annonceTest()),
        'GET /api/annonces/mes-annonces*': () => json(200, pageTest([annonceTest()])),
      },
    )
    await user.click(screen.getByRole('link', { name: /gérer mes annonces/i }))
    // Le menu et le pied de page ont aussi un lien « Publier une annonce » : on vise celui de la page.
    await user.click(await within(screen.getByRole('main')).findByRole('link', { name: /publier une annonce/i }))

    await user.type(screen.getByLabelText('Titre'), 'Villa neuve')
    await user.type(screen.getByLabelText('Prix (FCFA)'), '45000000')
    await user.type(screen.getByLabelText('Superficie (m²)'), '300')
    await user.type(screen.getByLabelText('Quartier'), 'Néma')
    await user.type(screen.getByLabelText('Équipements'), 'wifi, parking')
    await user.click(screen.getByRole('button', { name: /enregistrer et ajouter les photos/i }))

    // Après l'enregistrement, le propriétaire reste sur l'étape d'ajout des médias.
    expect(await screen.findByRole('heading', { name: 'Ajoutez les photos de votre bien' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Votre annonce est publiée dans le catalogue')
    expect(screen.getByLabelText('Ajouter des photos')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /terminer et voir mes annonces/i }))
    await screen.findByRole('heading', { name: 'Mes annonces' })
    const appel = api.mock.calls.find(([u, i]) => u === '/api/annonces' && i?.method === 'POST')!
    const corps = JSON.parse(String(appel[1]!.body))
    expect(corps).toMatchObject({ titre: 'Villa neuve', prix: 45000000, superficie: 300, quartier: 'Néma', equipements: ['wifi', 'parking'] })
    expect(corps).not.toHaveProperty('proprietaire')
    expect(corps).not.toHaveProperty('statut')
    expect((appel[1]!.headers as Record<string, string>).Authorization).toBe('Bearer jeton-de-test')
  })

  it('affiche les erreurs de validation renvoyées par le serveur', async () => {
    const { user } = await seConnecter(
      'PROPRIETAIRE',
      {
        'POST /api/annonces': () => json(400, { message: 'Données invalides.', details: { prix: 'doit être positif' } }),
        'GET /api/annonces/mes-annonces*': () => json(200, pageTest([])),
      },
    )
    await user.click(screen.getByRole('link', { name: /gérer mes annonces/i }))
    // Le menu et le pied de page ont aussi un lien « Publier une annonce » : on vise celui de la page.
    await user.click(await within(screen.getByRole('main')).findByRole('link', { name: /publier une annonce/i }))
    await user.type(screen.getByLabelText('Titre'), 'X')
    await user.click(screen.getByRole('button', { name: /enregistrer et ajouter les photos/i }))
    expect(await screen.findByText('doit être positif')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Données invalides.')
  })

  it("la suppression demande une confirmation puis appelle l'API", async () => {
    let liste = [annonceTest({ titre: 'À supprimer' })]
    const { api, user } = await seConnecter(
      'PROPRIETAIRE',
      {
        'GET /api/annonces/mes-annonces*': () => json(200, pageTest(liste)),
        [`DELETE /api/annonces/${liste[0].id}`]: () => {
          liste = []
          return new Response(null, { status: 204 })
        },
      },
    )
    await user.click(screen.getByRole('link', { name: /gérer mes annonces/i }))
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }))
    expect(api.mock.calls.some(([, i]) => i?.method === 'DELETE')).toBe(false)
    await user.click(screen.getByRole('button', { name: /confirmer la suppression/i }))
    expect(await screen.findByText("Vous n'avez publié aucune annonce.")).toBeInTheDocument()
  })

  it("affiche le refus du serveur (403) si la suppression est interdite", async () => {
    const { user } = await seConnecter(
      'PROPRIETAIRE',
      {
        'GET /api/annonces/mes-annonces*': () => json(200, pageTest([annonceTest()])),
        [`DELETE /api/annonces/${annonceTest().id}`]: () => json(403, { message: 'Cette annonce ne vous appartient pas.' }),
      },
    )
    await user.click(screen.getByRole('link', { name: /gérer mes annonces/i }))
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }))
    await user.click(screen.getByRole('button', { name: /confirmer la suppression/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Cette annonce ne vous appartient pas.'))
  })

  it("la modification pré-remplit le formulaire et envoie un PUT", async () => {
    const a = annonceTest()
    const { api, user } = await seConnecter(
      'PROPRIETAIRE',
      {
        'GET /api/annonces/mes-annonces*': () => json(200, pageTest([a])),
        [`GET /api/annonces/${a.id}`]: () => json(200, a),
        [`PUT /api/annonces/${a.id}`]: () => json(200, a),
      },
    )
    await user.click(screen.getByRole('link', { name: /gérer mes annonces/i }))
    await user.click(await screen.findByRole('link', { name: 'Modifier' }))
    expect(await screen.findByLabelText('Titre')).toHaveValue('Appartement lumineux')
    await user.selectOptions(screen.getByLabelText('Statut'), 'LOUE')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await screen.findByRole('heading', { name: 'Mes annonces' })
    const put = api.mock.calls.find(([, i]) => i?.method === 'PUT')!
    expect(JSON.parse(String(put[1]!.body)).statut).toBe('LOUE')
  })

  it("une annonce en attente n'offre pas de choix de statut, n'envoie pas de statut et explique pourquoi", async () => {
    const a = annonceTest({ statut: 'EN_ATTENTE' })
    const { api, user } = await seConnecter('PROPRIETAIRE', {
      'GET /api/annonces/mes-annonces*': () => json(200, pageTest([a])),
      [`GET /api/annonces/${a.id}`]: () => json(200, a),
      [`PUT /api/annonces/${a.id}`]: () => json(200, a),
    })
    await user.click(screen.getByRole('link', { name: /gérer mes annonces/i }))
    await user.click(await screen.findByRole('link', { name: 'Modifier' }))
    expect(await screen.findByLabelText('Titre')).toHaveValue('Appartement lumineux')
    expect(screen.queryByLabelText('Statut')).not.toBeInTheDocument()
    expect(screen.getByText(/Statut : En attente d’abonnement ou de mandat/)).toBeInTheDocument()
    // L'annonce n'étant pas publique, sa lecture se fait avec la session du propriétaire.
    const lecture = api.mock.calls.find(([u, i]) => u === `/api/annonces/${a.id}` && (i?.method ?? 'GET') === 'GET')!
    expect(JSON.stringify(lecture[1]?.headers)).toContain('Bearer jeton-de-test')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await screen.findByRole('heading', { name: 'Mes annonces' })
    const put = api.mock.calls.find(([, i]) => i?.method === 'PUT')!
    expect(JSON.parse(String(put[1]!.body))).not.toHaveProperty('statut')
  })

  it("Mes annonces montre le statut et le motif d'une annonce refusée", async () => {
    const refusee = annonceTest({ statut: 'REFUSEE', motifModeration: 'Photos non conformes' })
    await seConnecter('PROPRIETAIRE', { 'GET /api/annonces/mes-annonces*': () => json(200, pageTest([refusee])) })
    await userEvent.setup().click(screen.getByRole('link', { name: /gérer mes annonces/i }))
    const ligne = (await screen.findByRole('link', { name: 'Appartement lumineux' })).closest('li')!
    expect(ligne).toHaveTextContent('Refusée')
    expect(ligne).toHaveTextContent('Motif : Photos non conformes')
  })
})
