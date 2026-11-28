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
import Messagerie from './pages/Messagerie'
import OffresImmobilieres from './pages/OffresImmobilieres'
import MesContratsLocation from './pages/MesContratsLocation'
import IncidentsLocation from './pages/IncidentsLocation'
import EtatsDesLieux from './pages/EtatsDesLieux'
import DepotGarantie from './pages/DepotGarantie'
import { VerifierRecu } from './pages/VerifierRecu'
import EspaceLocataire from './pages/EspaceLocataire'
import EspaceProprietaire from './pages/EspaceProprietaire'
import AdminLitigesLocatifs from './pages/AdminLitigesLocatifs'
import AdminSupervisionLocative from './pages/AdminSupervisionLocative'
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
import AdminPhotos from './pages/AdminPhotos'
import AdminUtilisateurs from './pages/AdminUtilisateurs'
import AdminAgences from './pages/AdminAgences'
import AdminAbonnements from './pages/AdminAbonnements'
import MesAnnonces from './pages/MesAnnonces'
import FormulaireAnnonce from './pages/FormulaireAnnonce'
import ProfilAgence from './pages/ProfilAgence'
import MesSignalements from './pages/MesSignalements'
import AdminSignalements from './pages/AdminSignalements'
import AdminAudit from './pages/AdminAudit'
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
          <Route path="contact" element={<Contact />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="assistant" element={<AssistantImmobilier />} />
          <Route path="carte" element={<CarteBiens />} />
          <Route path="annonces/nouvelle" element={<RequireAuth><FormulaireAnnonce /></RequireAuth>} />
          <Route path="annonces/:id/modifier" element={<RequireAuth><FormulaireAnnonce /></RequireAuth>} />
          <Route path="annonces/:id" element={<DetailAnnonce />} />
          <Route path="agences/:slug" element={<ProfilAgence />} />
          <Route path="admin/demandes" element={<RequireRole roles={["ADMIN"]}><AdminDemandes /></RequireRole>} />
          <Route path="admin/annonces" element={<RequireRole roles={["ADMIN"]}><AdminModeration /></RequireRole>} />
          <Route path="admin/photos" element={<RequireRole roles={["ADMIN"]}><AdminPhotos /></RequireRole>} />
          <Route path="admin/utilisateurs" element={<RequireRole roles={["ADMIN"]}><AdminUtilisateurs /></RequireRole>} />
          <Route path="admin/agences" element={<RequireRole roles={["ADMIN"]}><AdminAgences /></RequireRole>} />
          <Route path="admin/abonnements" element={<RequireRole roles={["ADMIN"]}><AdminAbonnements /></RequireRole>} />
          <Route path="admin/visites" element={<RequireRole roles={["ADMIN"]}><Visites modeAdmin /></RequireRole>} />
          <Route path="admin/reservations" element={<RequireRole roles={["ADMIN"]}><Reservations /></RequireRole>} />
          <Route path="admin/supervision-locative" element={<RequireRole roles={["ADMIN"]}><AdminSupervisionLocative /></RequireRole>} />
          <Route path="admin/litiges-locatifs" element={<RequireRole roles={["ADMIN"]}><AdminLitigesLocatifs /></RequireRole>} />
          <Route path="admin/signalements" element={<RequireRole roles={["ADMIN"]}><AdminSignalements /></RequireRole>} />
          <Route path="admin/audit" element={<RequireRole roles={["ADMIN"]}><AdminAudit /></RequireRole>} />
          <Route path="mes-signalements" element={<RequireAuth><MesSignalements /></RequireAuth>} />
          <Route path="mes-annonces" element={<RequireAuth><MesAnnonces /></RequireAuth>} />
          <Route path="mes-visites" element={<RequireAuth><Visites /></RequireAuth>} />
          <Route path="mes-favoris" element={<RequireAuth><MesFavoris /></RequireAuth>} />
          <Route path="visites-recues" element={<RequireAuth><Visites /></RequireAuth>} />
          <Route path="mes-reservations" element={<RequireAuth><Reservations /></RequireAuth>} />
          <Route path="messagerie" element={<RequireAuth><Messagerie /></RequireAuth>} />
          <Route path="mes-offres" element={<RequireAuth><OffresImmobilieres /></RequireAuth>} />
          <Route path="offres-recues" element={<RequireAuth><OffresImmobilieres /></RequireAuth>} />
          <Route path="reservations-recues" element={<RequireAuth><Reservations /></RequireAuth>} />
          <Route path="mes-contrats-location" element={<RequireAuth><MesContratsLocation /></RequireAuth>} />
          <Route path="incidents-location" element={<RequireRole roles={["CLIENT", "PROPRIETAIRE", "ADMIN"]}><IncidentsLocation /></RequireRole>} />
          <Route path="etats-des-lieux" element={<RequireRole roles={["CLIENT", "PROPRIETAIRE", "ADMIN"]}><EtatsDesLieux /></RequireRole>} />
          <Route path="depot-garantie" element={<RequireRole roles={["CLIENT", "PROPRIETAIRE", "ADMIN"]}><DepotGarantie /></RequireRole>} />
          <Route path="espace-locataire" element={<RequireRole roles={["CLIENT", "ADMIN"]}><EspaceLocataire /></RequireRole>} />
          <Route path="espace-proprietaire" element={<RequireRole roles={["PROPRIETAIRE", "ADMIN"]}><EspaceProprietaire /></RequireRole>} />
          <Route path="mentions-legales" element={<MentionsLegales />} />
          <Route path="verifier-recu" element={<VerifierRecu />} />
          <Route path="verifier-recu/:code" element={<VerifierRecu />} />
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
