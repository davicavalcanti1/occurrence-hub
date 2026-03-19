import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Configuracoes from "./pages/Configuracoes";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import Developer from "./pages/Developer";
import AnaliseHistorico from "./pages/Analise";

import OccurrencesHub from "./features/occurrences/pages/OccurrencesHub";
import Ocorrencias from "./features/occurrences/pages/Ocorrencias";
import OccurrenceDetail from "./features/occurrences/pages/OccurrenceDetail";
import OccurrenceBook from "./features/occurrences/pages/OccurrenceBook";
import Kanbans from "./features/occurrences/pages/Kanbans";
import NovaOcorrenciaWizard from "./features/occurrences/pages/NovaOcorrenciaWizard";
import NovaOcorrenciaForm from "./features/occurrences/pages/NovaOcorrenciaForm";
import PublicPatientOccurrence from "./features/occurrences/pages/PatientOccurrence";
import FreeOccurrenceForm from "./features/occurrences/pages/FreeOccurrenceForm";
import PublicRevisaoLaudo from "./features/occurrences/pages/PublicRevisaoLaudo";
import PublicImageGallery from "./features/occurrences/pages/PublicImageGallery";
import PublicOcorrencia from "./features/occurrences/pages/PublicOcorrencia";
import AdminTypeSelection from "./features/occurrences/pages/admin/AdminTypeSelection";
import AdminSubtypeSelection from "./features/occurrences/pages/admin/AdminSubtypeSelection";
import AdminOccurrenceForm from "./features/occurrences/pages/admin/AdminOccurrenceForm";
import AdminOccurrenceDetail from "./features/occurrences/pages/AdminOccurrenceDetail";
import AdminKanban from "./features/occurrences/pages/AdminKanban";
import NursingSubtypeSelection from "./features/occurrences/pages/nursing/NursingSubtypeSelection";
import SegurancaPacienteSubtypeSelection from "@/features/occurrences/pages/SegurancaPacienteSubtypeSelection";
import SegurancaPacienteForm from "@/features/occurrences/pages/SegurancaPacienteForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/paciente" element={<PublicPatientOccurrence />} />
            <Route path="/public/revisao-laudo/:token" element={<PublicRevisaoLaudo />} />
            <Route path="/public/imagens/:token" element={<PublicImageGallery />} />
            <Route path="/public/ocorrencia/:token" element={<PublicOcorrencia />} />

            {/* Protected - all authenticated users */}
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/perfil" element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            } />

            {/* Occurrences */}
            <Route path="/ocorrencias" element={
              <ProtectedRoute>
                <OccurrencesHub />
              </ProtectedRoute>
            } />
            <Route path="/ocorrencias/historico" element={
              <ProtectedRoute>
                <AnaliseHistorico />
              </ProtectedRoute>
            } />
            <Route path="/ocorrencias/nova" element={
              <ProtectedRoute>
                <NovaOcorrenciaWizard />
              </ProtectedRoute>
            } />
            <Route path="/ocorrencias/nova/:tipo/:subtipo" element={
              <ProtectedRoute>
                <NovaOcorrenciaForm />
              </ProtectedRoute>
            } />
            <Route path="/ocorrencias/nova-livre" element={
              <ProtectedRoute>
                <FreeOccurrenceForm />
              </ProtectedRoute>
            } />

            {/* Administrative occurrences */}
            <Route path="/ocorrencias/nova/administrativa" element={
              <ProtectedRoute>
                <AdminTypeSelection />
              </ProtectedRoute>
            } />
            <Route path="/ocorrencias/nova/administrativa/:typeId" element={
              <ProtectedRoute>
                <AdminSubtypeSelection />
              </ProtectedRoute>
            } />
            <Route path="/ocorrencias/nova/administrativa/:typeId/:subtypeId" element={
              <ProtectedRoute>
                <AdminOccurrenceForm />
              </ProtectedRoute>
            } />
            <Route path="/ocorrencias/admin/:id" element={
              <ProtectedRoute>
                <AdminOccurrenceDetail />
              </ProtectedRoute>
            } />
            <Route path="/ocorrencias/kanban" element={
              <ProtectedRoute>
                <AdminKanban />
              </ProtectedRoute>
            } />

            {/* Patient Safety */}
            <Route path="/ocorrencias/nova/seguranca_paciente" element={
              <ProtectedRoute>
                <SegurancaPacienteSubtypeSelection />
              </ProtectedRoute>
            } />
            <Route path="/ocorrencias/nova/seguranca_paciente/:subtipo" element={
              <ProtectedRoute>
                <SegurancaPacienteForm />
              </ProtectedRoute>
            } />

            {/* Nursing */}
            <Route path="/ocorrencias/nova/enfermagem" element={
              <ProtectedRoute>
                <NursingSubtypeSelection />
              </ProtectedRoute>
            } />

            {/* Kanban & Book */}
            <Route path="/kanbans" element={
              <ProtectedRoute>
                <Kanbans />
              </ProtectedRoute>
            } />
            <Route path="/livro" element={
              <ProtectedRoute>
                <OccurrenceBook />
              </ProtectedRoute>
            } />

            {/* Admin */}
            <Route path="/configuracoes" element={
              <ProtectedRoute requireAdmin>
                <Configuracoes />
              </ProtectedRoute>
            } />
            <Route path="/developer" element={
              <ProtectedRoute allowedRoles={['developer']}>
                <Developer />
              </ProtectedRoute>
            } />

            {/* Generic occurrence detail — must be last */}
            <Route path="/ocorrencias/:id" element={
              <ProtectedRoute>
                <OccurrenceDetail />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
