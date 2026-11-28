import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AnnuaireAgences from './AnnuaireAgences'
import GestionPhotos from '../components/GestionPhotos'

const mockUseAuth = vi.fn()
vi.mock('../auth', () => ({ useAuth: () => mockUseAuth() }))

describe('Candidature agence avec CV privé et gestion photos', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseAuth.mockReturnValue({
      jeton: 'jwt-test',
      utilisateur: { id: 'u1', email: 'client@test.sn', nomComplet: 'Client Test', role: 'CLIENT' },
    })
  })

  it('affiche les champs téléphone, zone, motivation et CV privé sur Rejoindre une agence', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/agence/annuaire')) {
        return new Response(JSON.stringify([{ id: 'ag1', nom: 'Dakar Immo', slug: 'dakar-immo' }]), { status: 200 })
      }
      if (url.includes('/api/agence/ag1/evaluations')) {
        return new Response(JSON.stringify({ moyenne: 4.5, nombreAvis: 1, avis: [] }), { status: 200 })
      }
      return new Response(JSON.stringify([]), { status: 200 })
    })

    render(
      <MemoryRouter initialEntries={['/rejoindre-agence']}>
        <Routes>
          <Route path="/rejoindre-agence" element={<AnnuaireAgences />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Dakar Immo')).toBeInTheDocument()
    expect(screen.getByLabelText(/Téléphone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Zone d’intervention/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Motivation/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/CV privé/i)).toBeInTheDocument()
  })

  it('demande confirmation avant suppression dans GestionPhotos et propose le bouton Remplacer', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }))
    const onChange = vi.fn()

    render(
      <MemoryRouter>
        <GestionPhotos annonceId="a1" photos={['p1']} onChange={onChange} />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Remplacer la photo 1')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Supprimer la photo 1' }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining('/photos/p1'), expect.objectContaining({ method: 'DELETE' }))
  })

  it("propose le bouton Envoyer un avertissement sur un bien propriétaire et envoie l'avertissement", async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.endsWith('/avertir')) {
        return new Response(JSON.stringify({ id: 'av1' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
    })

    render(
      <MemoryRouter>
        <GestionPhotos annonceId="a1" photos={['p1']} onChange={vi.fn()} peutAvertir lectureSeule />
      </MemoryRouter>,
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Envoyer un avertissement' }))
    await user.type(screen.getByLabelText(/Motif de l’avertissement/i), 'Photo floue')
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))

    expect(await screen.findByText(/Avertissement envoyé au propriétaire/i)).toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/photos/a1/p1/avertir'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
