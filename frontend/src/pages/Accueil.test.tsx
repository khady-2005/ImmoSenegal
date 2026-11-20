import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { annonceTest, json, pageTest, reponseConnexion, simulerApi, utilisateurTest } from '../test/apiSimulee'

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

    expect(screen.getByRole('heading', { level: 1, name: 'Immo Sénégal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Découvrir le catalogue' })).toHaveAttribute('href', '/catalogue')
    const liensInscription = screen.getAllByRole('link', { name: 'Inscription' })
    expect(liensInscription.length).toBeGreaterThanOrEqual(1)
    liensInscription.forEach((l) => expect(l).toHaveAttribute('href', '/inscription'))
    expect(await screen.findByText(/la première annonce peut être la vôtre/i)).toBeInTheDocument()
  })

  it('affiche le nombre réel de logements disponibles, et rien quand il n\'y en a aucun', async () => {
    simulerApi({
      'GET /api/annonces?*': () => json(200, pageTest([annonceTest()], { totalElements: 1 })),
    })
    const { unmount } = afficher()
    expect(await screen.findByText('1 bien publié actuellement')).toBeInTheDocument()
    unmount()

    simulerApi({
      'GET /api/annonces?*': () => json(200, pageTest([annonceTest()], { totalElements: 12 })),
    })
    afficher()
    expect(await screen.findByText('12 biens publiés actuellement')).toBeInTheDocument()
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
    const liste = within(screen.getByRole('list', { name: 'Types de bien' }))
    for (const [nom, type] of Object.entries(attendus)) {
      expect(liste.getByRole('link', { name: nom })).toHaveAttribute('href', `/catalogue?type=${type}`)
    }
    await screen.findByText(/la première annonce peut être la vôtre/i)
  })

  it('propose un accès au catalogue depuis la page d’accueil', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    expect(screen.getByRole('link', { name: 'Rechercher un bien' })).toHaveAttribute('href', '/catalogue')
    expect(screen.queryByRole('tab', { name: 'En une phrase' })).not.toBeInTheDocument()
    await screen.findByText(/la première annonce peut être la vôtre/i)
  })

  it('ne présente pas les anciens onglets de recherche sur l’accueil', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    expect(screen.queryByRole('tab', { name: 'En une phrase' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Décrivez le logement que vous cherchez')).not.toBeInTheDocument()
    await screen.findByText(/la première annonce peut être la vôtre/i)
  })

  it('permet au visiteur d’ouvrir le catalogue depuis l’accueil', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    await userEvent.setup().click(screen.getByRole('link', { name: 'Découvrir le catalogue' }))
    expect(await screen.findByRole('heading', { name: 'Catalogue des annonces' })).toBeInTheDocument()
  })

  it('affiche les annonces récentes quand il y en a', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([annonceTest({ titre: 'Villa face au fleuve' })])) })
    afficher()
    expect(await screen.findByRole('link', { name: 'Villa face au fleuve' })).toBeInTheDocument()
  })

  it('le compteur ne compte que les vraies annonces : il demande exemple=false au serveur', async () => {
    const api = simulerApi({
      'GET /api/annonces?*': () => json(200, pageTest([annonceTest()], { totalElements: 1 })),
    })
    afficher()
    await screen.findByText('1 bien publié actuellement')
    const urls = api.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('exemple=false'))).toBe(true)
    // La grille, elle, montre aussi les exemples : elle ne filtre pas sur ce critère.
    expect(urls.some((u) => u.includes('taille=6') && !u.includes('exemple='))).toBe(true)
  })

  it('retire le badge Exemple des annonces illustratives, conserve une note globale et ne les compte pas comme réelles', async () => {
    simulerApi({
      'GET /api/annonces?*': () =>
        json(200, pageTest([annonceTest({ titre: 'Villa avec vue sur la mer', exemple: true, photos: ['p1'] })], { totalElements: 1 })),
    })
    afficher()
    expect(await screen.findByRole('link', { name: 'Villa avec vue sur la mer' })).toBeInTheDocument()
    expect(screen.queryByText('Exemple')).not.toBeInTheDocument()
    expect(screen.queryByText(/Catalogue de présentation/i)).not.toBeInTheDocument()
    // La photo d'un exemple est décrite comme illustrative, jamais comme la photo d'un vrai bien.
    expect(screen.getByAltText('Photo du type de bien présenté : Villa avec vue sur la mer')).toBeInTheDocument()
  })

  it('n’affiche aucune mention « Exemple » pour de vraies annonces', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([annonceTest({ titre: 'Villa face au fleuve' })])) })
    afficher()
    await screen.findByRole('link', { name: 'Villa face au fleuve' })
    expect(screen.queryByText('Exemple')).not.toBeInTheDocument()
    expect(screen.queryByText(/ces biens n’existent pas/)).not.toBeInTheDocument()
  })

  it('les onglets « À louer » et « À vendre » filtrent les annonces à la une', async () => {
    const api = simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([annonceTest()])) })
    const user = userEvent.setup()
    afficher()
    await screen.findByRole('link', { name: 'Appartement lumineux' })

    const groupe = within(screen.getByRole('group', { name: 'Type d’annonce' }))
    expect(groupe.getByRole('button', { name: 'Tout' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(groupe.getByRole('button', { name: 'À louer' }))
    expect(groupe.getByRole('button', { name: 'À louer' })).toHaveAttribute('aria-pressed', 'true')
    await screen.findByRole('link', { name: 'Appartement lumineux' })
    expect(api.mock.calls.some((c) => String(c[0]).includes('taille=6') && String(c[0]).includes('transaction=LOCATION'))).toBe(true)

    await user.click(groupe.getByRole('button', { name: 'À vendre' }))
    await screen.findByRole('link', { name: 'Appartement lumineux' })
    expect(api.mock.calls.some((c) => String(c[0]).includes('transaction=VENTE'))).toBe(true)
  })

  it('la page de détail d’une annonce de démonstration le dit clairement', async () => {
    const exemple = annonceTest({ exemple: true, titre: 'Villa avec vue sur la mer' })
    simulerApi({
      'POST /api/auth/refresh': () => reponseConnexion(),   // la fiche d'un bien exige un compte connecté
      [`GET /api/annonces/${exemple.id}`]: () => json(200, exemple),
    })
    render(
      <MemoryRouter initialEntries={[`/annonces/${exemple.id}`]}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'Villa avec vue sur la mer' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Annonce de démonstration')
  })

  it('ne présente pas de rubrique « À venir » sur la page d’accueil', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()

    await screen.findByText(/la première annonce peut être la vôtre/i)
    expect(screen.queryByRole('heading', { name: 'À venir' })).not.toBeInTheDocument()
  })

  it('propose des raccourcis vers le catalogue par type de bien', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    const types = within(screen.getByRole('list', { name: 'Types de bien' }))
    for (const [nom, type] of Object.entries({ Maisons: 'MAISON', Appartements: 'APPARTEMENT', Villas: 'VILLA', Studios: 'STUDIO', Terrains: 'TERRAIN' })) {
      expect(types.getByRole('link', { name: nom })).toHaveAttribute('href', `/catalogue?type=${type}`)
    }
    await screen.findByText(/la première annonce peut être la vôtre/i)
  })

  it('« Comment ça marche » montre trois étapes, avec des critères réellement reconnus', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    const section = screen.getByRole('heading', { name: 'Comment ça marche ?' }).closest('section')!
    expect(within(section).getAllByRole('listitem')).toHaveLength(3)
    for (const titre of ['Décrivez votre recherche', 'Trouvez le bien idéal', 'Comparez et choisissez']) {
      expect(within(section).getByRole('heading', { name: titre })).toBeInTheDocument()
    }
    // Les pastilles de la maquette sortent de la vraie analyse de phrase.
    expect(section).toHaveTextContent('Thiès')
    expect(section).toHaveTextContent('Budget max 150 000 FCFA')
    await screen.findByText(/la première annonce peut être la vôtre/i)
  })

  it('garde la FAQ sur sa page dédiée et conserve Comment ça marche sur l’accueil', async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    expect(screen.queryByRole('button', { name: 'Faut-il un compte pour chercher un logement ?' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Afficher les autres rubriques' }))
    expect(screen.getByRole('menuitem', { name: 'FAQ' })).toHaveAttribute('href', '/faq')
    expect(screen.getByRole('heading', { name: 'Comment ça marche ?' })).toBeInTheDocument()
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
    expect(liensEspace.length).toBeGreaterThanOrEqual(1)
    liensEspace.forEach((l) => expect(l).toHaveAttribute('href', '/tableau-de-bord'))
    expect(screen.queryByRole('link', { name: 'Créer mon compte' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ouvrez la porte.' })).not.toBeInTheDocument()
  })
})
