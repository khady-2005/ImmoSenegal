import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
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
import MesContratsLocation from './pages/MesContratsLocation'
import MesFavoris from './pages/MesFavoris'
import { FavorisProvider } from './favoris'
import Connexion from './pages/Connexion'
import Inscription from './pages/Inscription'
import MotDePasseOublie from './pages/MotDePasseOublie'
import ReinitialiserMotDePasse from './pages/ReinitialiserMotDePasse'
import Dashboard from './pages/Dashboard'
import MesAgences from './pages/MesAgences'
import AgenceTableauDeBord from './pages/AgenceTableauDeBord'
import CollaborateurTableauDeBord from './pages/CollaborateurTableauDeBord'
import AnnuaireAgences from './pages/AnnuaireAgences'
import AdminDemandes from './pages/AdminDemandes'
import AdminModeration from './pages/AdminModeration'
import AdminUtilisateurs from './pages/AdminUtilisateurs'
import MesAnnonces from './pages/MesAnnonces'
import FormulaireAnnonce from './pages/FormulaireAnnonce'
import RequireAuth from './components/RequireAuth'
import { AuthProvider, useAuth } from './auth'
import type { Role } from './types'

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { utilisateur, pret } = useAuth()
  if (!pret) return <p role="status" className="p-8 text-center text-slate-500">Chargement…</p>
  if (!utilisateur) return <Navigate to="/connexion" replace />
  if (!roles.includes(utilisateur.role)) return <Navigate to="/tableau-de-bord" replace />
  return <>{children}</>
}

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
          <Route path="mes-contrats-location" element={<RequireAuth><MesContratsLocation /></RequireAuth>} />
          <Route path="espace-locataire" element={<RequireRole roles={["CLIENT"]}><MesContratsLocation /></RequireRole>} />
          <Route path="espace-proprietaire" element={<RequireRole roles={["PROPRIETAIRE"]}><MesContratsLocation /></RequireRole>} />
          <Route path="mentions-legales" element={<MentionsLegales />} />
          <Route path="connexion" element={<Connexion />} />
          <Route path="mot-de-passe-oublie" element={<MotDePasseOublie />} />
          <Route path="reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
          <Route path="inscription" element={<Inscription />} />
          <Route path="tableau-de-bord" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="mes-agences" element={<RequireAuth><MesAgences /></RequireAuth>} />
          <Route path="rejoindre-agence" element={<RequireAuth><AnnuaireAgences /></RequireAuth>} />
          <Route path="mes-agences/:agenceId" element={<RequireAuth><AgenceTableauDeBord /></RequireAuth>} />
          <Route path="mes-agences/:agenceId/espace" element={<RequireAuth><CollaborateurTableauDeBord /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </FavorisProvider>
    </AuthProvider>
  )
}
