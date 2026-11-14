import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import APropos from './pages/APropos'
import FaqPage from './pages/FaqPage'
import Contact from './pages/Contact'
import Catalogue from './pages/Catalogue'
import AssistantImmobilier from './pages/AssistantImmobilier'
import CarteBiens from './pages/CarteBiens'
import DetailAnnonce from './pages/DetailAnnonce'
import NotFound from './pages/NotFound'
import MentionsLegales from './pages/MentionsLegales'
import Visites from './pages/Visites'
import Reservations from './pages/Reservations'
import MesFavoris from './pages/MesFavoris'
import { FavorisProvider } from './favoris'
import Connexion from './pages/Connexion'
import Inscription from './pages/Inscription'
import MotDePasseOublie from './pages/MotDePasseOublie'
import ReinitialiserMotDePasse from './pages/ReinitialiserMotDePasse'
import Dashboard from './pages/Dashboard'
import AdminDemandes from './pages/AdminDemandes'
import AdminModeration from './pages/AdminModeration'
import AdminUtilisateurs from './pages/AdminUtilisateurs'
import MesAnnonces from './pages/MesAnnonces'
import FormulaireAnnonce from './pages/FormulaireAnnonce'
import RequireAuth from './components/RequireAuth'
import { AuthProvider } from './auth'

export default function App() {
  return (
    <AuthProvider>
      <FavorisProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="a-propos" element={<APropos />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="contact" element={<RequireAuth><Contact /></RequireAuth>} />
          <Route path="catalogue" element={<RequireAuth><Catalogue /></RequireAuth>} />
          <Route path="assistant" element={<AssistantImmobilier />} />
          <Route path="carte" element={<RequireAuth><CarteBiens /></RequireAuth>} />
          <Route path="annonces/nouvelle" element={<RequireAuth><FormulaireAnnonce /></RequireAuth>} />
          <Route path="annonces/:id/modifier" element={<RequireAuth><FormulaireAnnonce /></RequireAuth>} />
          <Route path="annonces/:id" element={<RequireAuth><DetailAnnonce /></RequireAuth>} />
          <Route path="admin/demandes" element={<RequireAuth><AdminDemandes /></RequireAuth>} />
          <Route path="admin/annonces" element={<RequireAuth><AdminModeration /></RequireAuth>} />
          <Route path="admin/utilisateurs" element={<RequireAuth><AdminUtilisateurs /></RequireAuth>} />
          <Route path="mes-annonces" element={<RequireAuth><MesAnnonces /></RequireAuth>} />
          <Route path="mes-visites" element={<RequireAuth><Visites /></RequireAuth>} />
          <Route path="mes-favoris" element={<RequireAuth><MesFavoris /></RequireAuth>} />
          <Route path="visites-recues" element={<RequireAuth><Visites /></RequireAuth>} />
          <Route path="mes-reservations" element={<RequireAuth><Reservations /></RequireAuth>} />
          <Route path="reservations-recues" element={<RequireAuth><Reservations /></RequireAuth>} />
          <Route path="mentions-legales" element={<MentionsLegales />} />
          <Route path="connexion" element={<Connexion />} />
          <Route path="mot-de-passe-oublie" element={<MotDePasseOublie />} />
          <Route path="reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
          <Route path="inscription" element={<Inscription />} />
          <Route path="tableau-de-bord" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </FavorisProvider>
    </AuthProvider>
  )
}
