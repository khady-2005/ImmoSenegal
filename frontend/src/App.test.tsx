import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach } from 'vitest'
import App from './App'
import { annonceTest, json, pageTest, simulerApi } from './test/apiSimulee'

function afficher(chemin = '/') {
  return render(
    <MemoryRouter initialEntries={[chemin]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('Accueil', () => {
  it("présente l'accueil et dirige vers le catalogue sans formulaire de recherche intégré", async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([annonceTest({ titre: 'Villa des Pins' })])) })
    afficher()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ImmoSénégal')
    expect(screen.getByRole('link', { name: 'Rechercher un bien' })).toHaveAttribute('href', '/catalogue')
    expect(screen.queryByRole('form', { name: /recherche/i })).not.toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Villa des Pins' })).toHaveAttribute('href', '/annonces/a1111111-1111-1111-1111-111111111111')
  })

  it("n'affiche aucune annonce fictive quand la base est vide", async () => {
    simulerApi({ 'GET /api/annonces?*': () => json(200, pageTest([])) })
    afficher()
    expect(await screen.findByText(/Aucune annonce n'est encore publiée\./)).toBeInTheDocument()
    expect(screen.queryByText('Démonstration')).not.toBeInTheDocument()
  })

  it("affiche une erreur claire quand l'API est injoignable", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    afficher()
    expect(await screen.findByRole('alert')).toHaveTextContent(/impossible de joindre le serveur/i)
  })

  it('redirige un visiteur vers la connexion lorsqu’il choisit de consulter le catalogue', async () => {
    simulerApi({})
    afficher()
    await userEvent.setup().click(screen.getByRole('link', { name: 'Rechercher un bien' }))
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })
})

describe('Application', () => {
  it('redirige un visiteur non connecté vers la connexion avant le catalogue', async () => {
    simulerApi({})
    afficher('/catalogue')
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })

  it('affiche une page 404 pour une route inconnue', () => {
    simulerApi({})
    afficher('/n-importe-quoi')
    expect(screen.getByText('Page introuvable')).toBeInTheDocument()
  })
})
