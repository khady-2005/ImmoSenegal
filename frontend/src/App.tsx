import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import FaqPage from './pages/FaqPage'
import Contact from './pages/Contact'
import Catalogue from './pages/Catalogue'
import DetailAnnonce from './pages/DetailAnnonce'
import NotFound from './pages/NotFound'
import MentionsLegales from './pages/MentionsLegales'
import Visites from './pages/Visites'
import Connexion from './pages/Connexion'
import Inscription from './pages/Inscription'
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
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="contact" element={<Contact />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="annonces/nouvelle" element={<RequireAuth><FormulaireAnnonce /></RequireAuth>} />
          <Route path="annonces/:id/modifier" element={<RequireAuth><FormulaireAnnonce /></RequireAuth>} />
          <Route path="annonces/:id" element={<RequireAuth><DetailAnnonce /></RequireAuth>} />
          <Route path="admin/demandes" element={<RequireAuth><AdminDemandes /></RequireAuth>} />
          <Route path="admin/annonces" element={<RequireAuth><AdminModeration /></RequireAuth>} />
          <Route path="admin/utilisateurs" element={<RequireAuth><AdminUtilisateurs /></RequireAuth>} />
          <Route path="mes-annonces" element={<RequireAuth><MesAnnonces /></RequireAuth>} />
          <Route path="mes-visites" element={<RequireAuth><Visites /></RequireAuth>} />
          <Route path="visites-recues" element={<RequireAuth><Visites /></RequireAuth>} />
          <Route path="mentions-legales" element={<MentionsLegales />} />
          <Route path="connexion" element={<Connexion />} />
          <Route path="inscription" element={<Inscription />} />
          <Route path="tableau-de-bord" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
