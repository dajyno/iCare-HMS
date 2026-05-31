import React from "react";
import { Routes, Route, Navigate, BrowserRouter, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import { TenantProvider } from "./context/TenantContext";
import { GlobalSettingsProvider, useGlobalSettings } from "./context/GlobalSettingsContext";
import { StaffProvider } from "./pages/Staff/StaffContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";
import TenantRouteGuard from "./components/TenantRouteGuard";
import HospitalNotFound from "./components/HospitalNotFound";

import Login from "./pages/Auth/Login";
import TenantLogin from "./pages/Auth/TenantLogin";
import AuthCallback from "./pages/Auth/AuthCallback";
import AdminLogin from "./pages/Admin/AdminLogin";
import PlatformOverview from "./pages/Admin/PlatformOverview";
import TenantsDirectory from "./pages/Admin/TenantsDirectory";
import TenantDetail from "./pages/Admin/TenantDetail";
import LicensingManager from "./pages/Admin/LicensingManager";
import HealthMonitor from "./pages/Admin/HealthMonitor";
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
import ReportsHub from "./pages/Reports/ReportsHub";
import ClinicalReports from "./pages/Reports/ClinicalReports";
import RevenueDashboard from "./pages/Reports/Revenue/RevenueDashboard";

const IndividualPatients = () => <PatientList defaultCategory="Individual" />;
const CorporatePatients = () => <PatientList defaultCategory="Corporate" />;
const HmoPatients = () => <PatientList defaultCategory="HMO" />;

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-xl bg-slate-700" />
        <Skeleton className="h-4 w-24 bg-slate-700" />
      </div>
    </div>
  );

  if (!admin && location.pathname !== "/admin/login") {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster richColors />
        <TenantProvider>
          <AuthProvider>
            <AdminAuthProvider>
              <StaffProvider>
              <GlobalSettingsProvider>
              <Routes>
                {/* Super Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                  <Route index element={<PlatformOverview />} />
                  <Route path="tenants" element={<TenantsDirectory />} />
                  <Route path="tenants/:tenantId" element={<TenantDetail />} />
                  <Route path="licensing" element={<LicensingManager />} />
                  <Route path="health" element={<HealthMonitor />} />
                </Route>

                {/* Tenant Login */}
                <Route path="/:hospital_slug/login" element={<TenantLogin />} />
                <Route path="/:hospital_slug/auth/callback" element={<AuthCallback />} />

                {/* Tenant Routes */}
                <Route path="/:hospital_slug" element={<TenantRouteGuard />}>
                  <Route path="dashboard" element={<Overview />} />
                  <Route path="patients" element={<PatientList />} />
                  <Route path="patients/individual" element={<IndividualPatients />} />
                  <Route path="patients/family" element={<FamilyPatients />} />
                  <Route path="patients/corporate" element={<CorporatePatients />} />
                  <Route path="patients/hmo" element={<HmoPatients />} />
                  <Route path="patients/:id" element={<PatientProfile />} />
                  <Route path="appointments" element={<AppointmentList />} />
                  <Route path="consultations" element={<ConsultationList />} />
                  <Route path="consultations/workspace" element={<ConsultationWorkspace />} />
                  <Route path="consultations/workspace/:patientId" element={<ConsultationWorkspace />} />
                  <Route path="consultations/vitals" element={<VitalSigns />} />
                  <Route path="laboratory" element={<LabModule />} />
                  <Route path="radiology" element={<RadiologyModule />} />
                  <Route path="pharmacy" element={<Navigate to="prescriptions" replace />} />
                  <Route path="pharmacy/prescriptions" element={<PrescriptionTerminal />} />
                  <Route path="pharmacy/inventory" element={<InventoryMatrix />} />
                  <Route path="pharmacy/analytics" element={<BillingAnalytics />} />
                  <Route path="billing" element={<BillingOverview />} />
                  <Route path="accounting" element={<AccountingPage />} />
                  <Route path="accounting/registries" element={<RegistriesPage />} />
                  <Route path="accounting/ledger" element={<LedgerPage />} />
                  <Route path="accounting/banks" element={<BanksPage />} />
                  <Route path="accounting/reports" element={<ReportsPage />} />
                  <Route path="inventory" element={<InventoryList />} />
                  <Route path="inpatient" element={<InpatientOverview />} />
                  <Route path="staff" element={<StaffLayout />}>
                    <Route index element={<StaffList />} />
                    <Route path=":id" element={<StaffProfile />} />
                  </Route>
                  <Route path="reports" element={<ReportsHub />} />
                  <Route path="reports/clinical" element={<ClinicalReports />} />
                  <Route path="reports/revenue" element={<RevenueDashboard />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<Profile />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* Legacy redirects — preserve old flat URLs */}
                <Route path="/login" element={<Navigate to="/demo/login" replace />} />
                <Route path="/dashboard" element={<Navigate to="/demo/dashboard" replace />} />
                <Route path="/" element={<Navigate to="/demo/dashboard" replace />} />
                <Route path="*" element={<HospitalNotFound />} />
              </Routes>
              </GlobalSettingsProvider>
              </StaffProvider>
            </AdminAuthProvider>
          </AuthProvider>
        </TenantProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
