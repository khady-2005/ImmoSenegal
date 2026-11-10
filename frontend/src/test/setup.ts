import '@testing-library/jest-dom/vitest'

// jsdom n'implémente pas le défilement : on le neutralise pour garder des journaux de test propres.
window.scrollTo = () => {}
