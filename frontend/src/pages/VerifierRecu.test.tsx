import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VerifierRecu } from './VerifierRecu'

describe('VerifierRecu', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche les informations minimales de simulation sans nom complet', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          valide: true,
          codeVerification: 'SIM-TEST-123',
          modePaiement: 'WAVE_SIMULATION',
          montant: 250000,
          periode: '2026-11-01',
          datePaiement: '2026-11-28',
          simulation: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    render(
      <MemoryRouter initialEntries={['/verifier-recu/SIM-TEST-123']}>
        <Routes>
          <Route path="/verifier-recu/:code" element={<VerifierRecu />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText(/Reçu valide/i)).toBeInTheDocument())
    expect(screen.getByText(/SIMULATION — Paiement simulé/i)).toBeInTheDocument()
    expect(screen.getByText(/SIM-TEST-123/)).toBeInTheDocument()
    expect(screen.queryByText(/Locataire/i)).not.toBeInTheDocument()
  })
})
