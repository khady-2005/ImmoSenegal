/** Prépare les photos avant l'envoi : limite les dimensions et le poids sans intervention de l'utilisateur. */
export async function preparerPhoto(fichier: File): Promise<File> {
  if (!fichier.type.startsWith('image/')) throw new Error('Sélectionne un fichier image.')
  let image: ImageBitmap
  try {
    image = await createImageBitmap(fichier)
  } catch {
    throw new Error('Cette image ne peut pas être ouverte. Essaie un fichier JPG, PNG ou WebP.')
  }
  try {
    const coteMax = 1600
    const echelle = Math.min(1, coteMax / Math.max(image.width, image.height))
    const largeur = Math.max(1, Math.round(image.width * echelle))
    const hauteur = Math.max(1, Math.round(image.height * echelle))
    const canvas = document.createElement('canvas')
    canvas.width = largeur
    canvas.height = hauteur
    const contexte = canvas.getContext('2d')
    if (!contexte) throw new Error('Impossible de préparer cette image.')
    contexte.fillStyle = '#ffffff'
    contexte.fillRect(0, 0, largeur, hauteur)
    contexte.drawImage(image, 0, 0, largeur, hauteur)
    let qualite = 0.86
    let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualite))
    while (blob && blob.size > 4.5 * 1024 * 1024 && qualite > 0.45) {
      qualite = Math.max(0.45, qualite - 0.1)
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualite))
    }
    if (!blob || blob.size > 4.5 * 1024 * 1024) {
      throw new Error('Cette image reste trop volumineuse après compression. Choisis une autre image.')
    }
    const nom = fichier.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], nom, { type: 'image/jpeg', lastModified: Date.now() })
  } finally {
    image.close()
  }
}
