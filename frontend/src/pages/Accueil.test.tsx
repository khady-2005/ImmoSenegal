import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { annonceTest, json, pageTest, parametresDe, reponseConnexion, simulerApi, utilisateurTest } from '../test/apiSimulee'

function afficher() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe("Page d'accueil", () => {
  it("propose l'inscription et le catalogue à un visiteur, et invite à publier quand il n'y a aucune annonce", async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()

    expect(screen.getByRole('heading', { level: 1, name: 'Rentrez enfin chez vous.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir tous les logements' })).toHaveAttribute('href', '/catalogue')
    const liensInscription = screen.getAllByRole('link', { name: 'Créer mon compte' })
    expect(liensInscription.length).toBeGreaterThanOrEqual(2)
    liensInscription.forEach((l) => expect(l).toHaveAttribute('href', '/inscription'))
    expect(await screen.findByText(/la première annonce peut être la vôtre/i)).toBeInTheDocument()
  })

  it('affiche le nombre réel de logements disponibles, et rien quand il n\'y en a aucun', async () => {
    simulerApi({
      'GET /api/annonces?*': () => json(200, pageTest([annonceTest()], { totalElements: 1 })),
    })
    const { unmount } = afficher()
    expect(await screen.findByText('1 logement disponible en ce moment')).toBeInTheDocument()
    unmount()

    simulerApi({
      'GET /api/annonces?*': () => json(200, pageTest([annonceTest()], { totalElements: 12 })),
    })
    afficher()
    expect(await screen.findByText('12 logements disponibles en ce moment')).toBeInTheDocument()
  })

  it('n\'affiche aucun compteur quand la base est vide', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    await screen.findByText(/la première annonce peut être la vôtre/i)
    expect(screen.queryByText(/disponible.* en ce moment/)).not.toBeInTheDocument()
  })

  it('propose un raccourci vers le catalogue pour chaque type de bien', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    const attendus: Record<string, string> = {
      Maisons: 'MAISON',
      Appartements: 'APPARTEMENT',
      Studios: 'STUDIO',
      Villas: 'VILLA',
      Terrains: 'TERRAIN',
    }
    for (const [nom, type] of Object.entries(attendus)) {
      expect(screen.getByRole('link', { name: nom })).toHaveAttribute('href', `/catalogue?type=${type}`)
    }
    await screen.findByText(/la première annonce peut être la vôtre/i)
  })

  it('transforme une phrase libre en filtres du catalogue et les envoie au serveur', async () => {
    const api = simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    const user = userEvent.setup()
    afficher()

    await user.type(screen.getByLabelText('Décrivez le logement que vous cherchez'), 'studio à Ziguinchor sous 80 000 FCFA')
    // Les critères reconnus sont montrés avant l'envoi.
    expect(await screen.findByText('Budget max 80 000 FCFA')).toBeInTheDocument()
    expect(screen.getByText('Studio')).toBeInTheDocument()
    await user.click(within(screen.getByRole('form', { name: /recherche en une phrase/i })).getByRole('button', { name: /rechercher/i }))

    expect(await screen.findByRole('heading', { name: 'Catalogue des annonces' })).toBeInTheDocument()
    const p = parametresDe(api.mock.calls.at(-1)![0])
    expect(p.get('transaction')).toBe('LOCATION')
    expect(p.get('type')).toBe('STUDIO')
    expect(p.get('ville')).toBe('Ziguinchor')
    expect(p.get('prixMax')).toBe('80000')
  })

  it("n'ouvre pas le catalogue et l'explique quand la phrase ne contient aucun critère", async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    const user = userEvent.setup()
    afficher()
    await user.type(screen.getByLabelText('Décrivez le logement que vous cherchez'), 'bonjour')
    await user.click(within(screen.getByRole('form', { name: /recherche en une phrase/i })).getByRole('button', { name: /rechercher/i }))

    expect(await screen.findByText(/n’avons reconnu aucun critère/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Catalogue des annonces' })).not.toBeInTheDocument()
  })

  it('le choix Acheter est pris en compte quand la phrase ne dit ni louer ni acheter', async () => {
    const api = simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    const user = userEvent.setup()
    afficher()
    await user.click(screen.getByRole('button', { name: 'Acheter' }))
    await user.type(screen.getByLabelText('Décrivez le logement que vous cherchez'), 'villa à Dakar')
    await user.click(within(screen.getByRole('form', { name: /recherche en une phrase/i })).getByRole('button', { name: /rechercher/i }))
    await screen.findByRole('heading', { name: 'Catalogue des annonces' })
    expect(parametresDe(api.mock.calls.at(-1)![0]).get('transaction')).toBe('VENTE')
  })

  it('affiche les annonces récentes quand il y en a', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([annonceTest({ titre: 'Villa face au fleuve' })])) })
    afficher()
    expect(await screen.findByRole('link', { name: 'Villa face au fleuve' })).toBeInTheDocument()
  })

  it('annonce honnêtement les fonctions pas encore disponibles', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()

    const section = screen.getByRole('heading', { name: 'À venir' }).closest('section')!
    expect(section).toHaveTextContent('Ces fonctions ne sont pas encore disponibles.')
    for (const nom of ['Demande de visite en ligne', 'Messagerie avec le propriétaire', 'Carte des biens', 'Assistant de recherche']) {
      expect(section).toHaveTextContent(nom)
    }
    await screen.findByText(/la première annonce peut être la vôtre/i)
  })

  it('propose un raccourci vers le catalogue pour chaque ville', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    const villes = within(screen.getByRole('list', { name: 'Villes' }))
    expect(villes.getByRole('link', { name: 'Dakar' })).toHaveAttribute('href', '/catalogue?ville=Dakar')
    expect(villes.getByRole('link', { name: 'Thiès' })).toHaveAttribute('href', '/catalogue?ville=Thi%C3%A8s')
    expect(villes.getByRole('link', { name: 'Saint-Louis' })).toHaveAttribute('href', '/catalogue?ville=Saint-Louis')
    await screen.findByText(/la première annonce peut être la vôtre/i)
  })

  it('« Comment ça marche » montre trois étapes, avec des critères réellement reconnus', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    const section = screen.getByRole('heading', { name: 'Comment ça marche' }).closest('section')!
    expect(within(section).getAllByRole('listitem')).toHaveLength(3)
    for (const titre of ['Décrivez', 'Affinez', 'Ouvrez la fiche']) {
      expect(within(section).getByRole('heading', { name: titre })).toBeInTheDocument()
    }
    // Les pastilles de la maquette sortent de la vraie analyse de phrase.
    expect(section).toHaveTextContent('Thiès')
    expect(section).toHaveTextContent('Budget max 150 000 FCFA')
    await screen.findByText(/la première annonce peut être la vôtre/i)
  })

  it('la FAQ s’ouvre et se referme, une réponse à la fois, sans promettre ce qui n’existe pas', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    const user = userEvent.setup()
    afficher()

    const premiere = screen.getByRole('button', { name: 'Faut-il un compte pour chercher un logement ?' })
    const paiement = screen.getByRole('button', { name: 'Puis-je réserver, payer ou écrire au propriétaire ?' })
    expect(premiere).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText(/Le catalogue est ouvert à tous/)).not.toBeVisible()

    await user.click(premiere)
    expect(premiere).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Le catalogue est ouvert à tous/)).toBeVisible()

    await user.click(paiement)
    expect(premiere).toHaveAttribute('aria-expanded', 'false')
    expect(paiement).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Pas encore\. La demande de visite/)).toBeVisible()

    await user.click(paiement)
    expect(paiement).toHaveAttribute('aria-expanded', 'false')
    await screen.findByText(/la première annonce peut être la vôtre/i)
  })

  it('le pied de page mène au catalogue et au compte, et change quand la personne est connectée', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    const { unmount } = afficher()
    const pied = within(screen.getByRole('contentinfo'))
    expect(pied.getByRole('link', { name: 'Logements à louer' })).toHaveAttribute('href', '/catalogue?transaction=LOCATION')
    expect(pied.getByRole('link', { name: 'Logements à acheter' })).toHaveAttribute('href', '/catalogue?transaction=VENTE')
    expect(pied.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/connexion')
    expect(pied.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', '/inscription')
    await screen.findByText(/la première annonce peut être la vôtre/i)
    unmount()

    simulerApi({
      'POST /api/auth/refresh': () => reponseConnexion(),
      'GET /api/auth/me': () => json(200, utilisateurTest),
      'GET /api/annonces?*': () => json(200, pageTest([])),
    })
    afficher()
    const piedConnecte = within(screen.getByRole('contentinfo'))
    expect(await piedConnecte.findByRole('link', { name: 'Tableau de bord' })).toHaveAttribute('href', '/tableau-de-bord')
    expect(piedConnecte.queryByRole('link', { name: 'Se connecter' })).not.toBeInTheDocument()
  })

  it('remplace les appels à créer un compte par « Mon espace » quand la personne est connectée', async () => {
    simulerApi({
      'POST /api/auth/refresh': () => reponseConnexion(),
      'GET /api/auth/me': () => json(200, utilisateurTest),
      'GET /api/annonces?*': () => json(200, pageTest([])),
    })
    afficher()

    // « Mon espace » apparaît dans le menu et dans le haut de page : tous les liens mènent au tableau de bord.
    const liensEspace = await screen.findAllByRole('link', { name: 'Mon espace' })
    expect(liensEspace.length).toBeGreaterThanOrEqual(2)
    liensEspace.forEach((l) => expect(l).toHaveAttribute('href', '/tableau-de-bord'))
    expect(screen.queryByRole('link', { name: 'Créer mon compte' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ouvrez la porte.' })).not.toBeInTheDocument()
  })
})
