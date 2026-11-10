import { describe, expect, it } from 'vitest'
import { analyser, lieuVersFiltre, versCatalogue } from './rechercheLibre'

describe('Recherche en une phrase', () => {
  it('reconnaît le type, le quartier, la ville et le budget', () => {
    const c = analyser('studio près du campus à Ziguinchor sous 80 000 FCFA')
    expect(c).toMatchObject({ type: 'STUDIO', quartier: 'Campus', ville: 'Ziguinchor', prixMax: 80000, transaction: 'LOCATION' })
    expect(c.reconnus).toEqual(['Studio', 'Ziguinchor', 'Quartier Campus', 'Budget max 80 000 FCFA'])
  })

  it('reconnaît « à vendre » et une ville sans inventer de quartier', () => {
    const c = analyser('villa à vendre à Dakar')
    expect(c).toMatchObject({ type: 'VILLA', transaction: 'VENTE', ville: 'Dakar' })
    expect(c.quartier).toBeUndefined()
    expect(c.prixMax).toBeUndefined()
  })

  it('garde les accents du quartier saisi et reconnaît « moins de »', () => {
    const c = analyser('maison à louer à Kandé moins de 150 000')
    expect(c).toMatchObject({ type: 'MAISON', transaction: 'LOCATION', quartier: 'Kandé', prixMax: 150000 })
  })

  it('comprend les millions, les « k » et les virgules', () => {
    expect(analyser('terrain 15 millions').prixMax).toBe(15_000_000)
    expect(analyser('terrain 1,5 million').prixMax).toBe(1_500_000)
    expect(analyser('studio à Saint-Louis 60k')).toMatchObject({ ville: 'Saint-Louis', prixMax: 60000 })
    expect(analyser('villa 45.000.000').prixMax).toBe(45_000_000)
  })

  it('utilise le choix Louer / Acheter par défaut, sauf si la phrase dit autre chose', () => {
    expect(analyser('studio', 'VENTE').transaction).toBe('VENTE')
    expect(analyser('studio à louer', 'VENTE').transaction).toBe('LOCATION')
    expect(analyser('studio', 'VENTE').reconnus).toEqual(['Studio'])
  })

  it('ne prend pas pour un budget les pièces, les chambres, les surfaces ni un minimum', () => {
    const c = analyser('appartement 3 pièces 85 m2 à Thiès')
    expect(c.prixMax).toBeUndefined()
    expect(c.ville).toBe('Thiès')
    expect(analyser('2 chambres').prixMax).toBeUndefined()
    expect(analyser('maison plus de 50000').prixMax).toBeUndefined()
  })

  it('ne trouve rien dans une phrase sans critère', () => {
    const c = analyser('bonjour tout le monde')
    expect(c.trouve).toBe(false)
    expect(c.reconnus).toEqual([])
  })

  it('construit une adresse de catalogue avec les mêmes paramètres que le formulaire', () => {
    const c = analyser('studio à Ziguinchor sous 80 000', 'LOCATION')
    const url = new URL(versCatalogue(c), 'http://exemple.test')
    expect(url.pathname).toBe('/catalogue')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      transaction: 'LOCATION',
      type: 'STUDIO',
      ville: 'Ziguinchor',
      prixMax: '80000',
    })
  })

  it("n'envoie jamais de paramètre inconnu du serveur", () => {
    const c = analyser("<script>alert(1)</script> villa à vendre à Dakar proprietaireId=pirate")
    const url = new URL(versCatalogue(c), 'http://exemple.test')
    for (const cle of url.searchParams.keys()) {
      expect(['transaction', 'type', 'ville', 'quartier', 'prixMax']).toContain(cle)
    }
  })
})

describe('lieuVersFiltre', () => {
  it('reconnaît une ville connue, avec ou sans accent, tiret ou majuscule', () => {
    expect(lieuVersFiltre('dakar')).toEqual({ ville: 'Dakar' })
    expect(lieuVersFiltre(' Thies ')).toEqual({ ville: 'Thiès' })
    expect(lieuVersFiltre('saint louis')).toEqual({ ville: 'Saint-Louis' })
  })

  it('cherche tout autre texte comme un quartier, et ignore un champ vide', () => {
    expect(lieuVersFiltre('Kandé')).toEqual({ quartier: 'Kandé' })
    expect(lieuVersFiltre('Médina, Dakar')).toEqual({ quartier: 'Médina, Dakar' })
    expect(lieuVersFiltre('   ')).toEqual({})
  })
})
