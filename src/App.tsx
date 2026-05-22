import React from "react";
import { Routes, Route, Navigate, BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Auth/Login";
import Overview from "./pages/Dashboard/Overview";
import PatientList from "./pages/Patients/PatientList";
import PatientProfile from "./pages/Patients/PatientProfile";
import FamilyPatients from "./pages/Patients/FamilyPatients";
import AppointmentList from "./pages/Appointments/AppointmentList";
import ConsultationList from "./pages/Consultations/ConsultationList";
import ConsultationWorkspace from "./pages/Consultations/ConsultationWorkspace";
import VitalSigns from "./pages/Consultations/VitalSigns";
import LabModule from "./pages/Laboratory/LabModule";
import PrescriptionTerminal from "./pages/Pharmacy/prescriptions/PrescriptionTerminal";
import InventoryMatrix from "./pages/Pharmacy/inventory/InventoryMatrix";
import BillingAnalytics from "./pages/Pharmacy/analytics/BillingAnalytics";
import BillingOverview from "./pages/Billing/BillingOverview";
import InpatientOverview from "./pages/Inpatient/InpatientOverview";
import InventoryList from "./pages/Inventory/InventoryList";
import RadiologyModule from "./pages/Radiology/RadiologyModule";
import AccountingPage from "./pages/Accounting/AccountingPage";
import RegistriesPage from "./pages/Accounting/registries/RegistriesPage";
import LedgerPage from "./pages/Accounting/ledger/LedgerPage";
import BanksPage from "./pages/Accounting/banks/BanksPage";
import ReportsPage from "./pages/Accounting/reports/ReportsPage";
import Settings from "./pages/Dashboard/Settings";
import Profile from "./pages/Dashboard/Profile";
import StaffLayout from "./pages/Staff/StaffLayout";
import StaffList from "./pages/Staff/StaffList";
import StaffProfile from "./pages/Staff/StaffProfile";
import { StaffProvider } from "./pages/Staff/StaffContext";
import { GlobalSettingsProvider, useGlobalSettings } from "./context/GlobalSettingsContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReportsHub from "./pages/Reports/ReportsHub";
import ClinicalReports from "./pages/Reports/ClinicalReports";
import StaffReports from "./pages/Reports/StaffReports";
const IndividualPatients = () => <PatientList defaultCategory="Individual" />;
const CorporatePatients = () => <PatientList defaultCategory="Corporate" />;
const HmoPatients = () => <PatientList defaultCategory="HMO" />;

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const { settings } = useGlobalSettings();
  const location = useLocation();

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (user.role) {
    const roleKey = user.role as string;
    const matrix = settings.rbacMatrix;
    const perm = matrix[roleKey as keyof typeof matrix];
    if (perm && perm.allowedRoutes.length > 0) {
      const baseRoutes = perm.allowedRoutes;
      const overrides = settings.staffRouteOverrides?.[user.id] || [];
      const effectiveRoutes = [...baseRoutes, ...overrides];
      const path = location.pathname;
      const allowed = effectiveRoutes.some((route: string) =>
        path === route || path.startsWith(route + "/")
      );
      if (!allowed) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <StaffProvider>
          <GlobalSettingsProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Overview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <PatientList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/individual"
              element={
                <ProtectedRoute>
                  <IndividualPatients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/family"
              element={
                <ProtectedRoute>
                  <FamilyPatients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/corporate"
              element={
                <ProtectedRoute>
                  <CorporatePatients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/hmo"
              element={
                <ProtectedRoute>
                  <HmoPatients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/:id"
              element={
                <ProtectedRoute>
                  <PatientProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/appointments"
              element={
                <ProtectedRoute>
                  <AppointmentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations"
              element={
                <ProtectedRoute>
                  <ConsultationList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations/workspace"
              element={
                <ProtectedRoute>
                  <ConsultationWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations/workspace/:patientId"
              element={
                <ProtectedRoute>
                  <ConsultationWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations/vitals"
              element={
                <ProtectedRoute>
                  <VitalSigns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/laboratory"
              element={
                <ProtectedRoute>
                  <LabModule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/radiology"
              element={
                <ProtectedRoute>
                  <RadiologyModule />
                </ProtectedRoute>
              }
            />
             <Route
               path="/pharmacy"
               element={
                 <ProtectedRoute>
                   <Navigate to="/pharmacy/prescriptions" replace />
                 </ProtectedRoute>
               }
             />
             <Route
               path="/pharmacy/prescriptions"
               element={
                 <ProtectedRoute>
                   <PrescriptionTerminal />
                 </ProtectedRoute>
               }
             />
             <Route
               path="/pharmacy/inventory"
               element={
                 <ProtectedRoute>
                   <InventoryMatrix />
                 </ProtectedRoute>
               }
             />
             <Route
               path="/pharmacy/analytics"
               element={
                 <ProtectedRoute>
                   <BillingAnalytics />
                 </ProtectedRoute>
               }
             />
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <BillingOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting"
              element={
                <ProtectedRoute>
                  <AccountingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/registries"
              element={
                <ProtectedRoute>
                  <RegistriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/ledger"
              element={
                <ProtectedRoute>
                  <LedgerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/banks"
              element={
                <ProtectedRoute>
                  <BanksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <InventoryList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inpatient"
              element={
                <ProtectedRoute>
                  <InpatientOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute>
                  <StaffLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StaffList />} />
              <Route path=":id" element={<StaffProfile />} />
            </Route>
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsHub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/clinical"
              element={
                <ProtectedRoute>
                  <ClinicalReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/staff"
              element={
                <ProtectedRoute>
                  <StaffReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </GlobalSettingsProvider>
          </StaffProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
