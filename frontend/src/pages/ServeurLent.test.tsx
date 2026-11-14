import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BandeauServeurLent from '../components/BandeauServeurLent'
import { appelApi } from '../api'

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function reponseJson() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Serveur lent (réveil de l\'hébergement)', () => {
  it("affiche un message d'attente après 4 secondes, puis le retire quand le serveur répond", async () => {
    let repondre: (r: Response) => void = () => undefined
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { repondre = resolve })))

    render(<BandeauServeurLent />)
    let requete!: Promise<unknown>
    await act(async () => {
      requete = appelApi('/api/test')
      await Promise.resolve()
    })
    expect(screen.queryByText(/le serveur se réveille/i)).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100)
    })
    expect(screen.getByText(/le serveur se réveille/i)).toBeInTheDocument()

    await act(async () => {
      repondre(reponseJson())
      await requete
    })
    expect(screen.queryByText(/le serveur se réveille/i)).not.toBeInTheDocument()
  })

  it("n'affiche rien quand le serveur répond vite", async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(reponseJson())))
    render(<BandeauServeurLent />)

    await act(async () => {
      await appelApi('/api/test')
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(screen.queryByText(/le serveur se réveille/i)).not.toBeInTheDocument()
  })
})
