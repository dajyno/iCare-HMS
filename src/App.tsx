import React, { Suspense, lazy } from "react";
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

const Login = lazy(() => import("./pages/Auth/Login"));
const TenantLogin = lazy(() => import("./pages/Auth/TenantLogin"));
const AuthCallback = lazy(() => import("./pages/Auth/AuthCallback"));
const AdminLogin = lazy(() => import("./pages/Admin/AdminLogin"));
const PlatformOverview = lazy(() => import("./pages/Admin/PlatformOverview"));
const TenantsDirectory = lazy(() => import("./pages/Admin/TenantsDirectory"));
const TenantDetail = lazy(() => import("./pages/Admin/TenantDetail"));
const LicensingManager = lazy(() => import("./pages/Admin/LicensingManager"));
const HealthMonitor = lazy(() => import("./pages/Admin/HealthMonitor"));
const Overview = lazy(() => import("./pages/Dashboard/Overview"));
const PatientList = lazy(() => import("./pages/Patients/PatientList"));
const PatientProfile = lazy(() => import("./pages/Patients/PatientProfile"));
const FamilyPatients = lazy(() => import("./pages/Patients/FamilyPatients"));
const AppointmentList = lazy(() => import("./pages/Appointments/AppointmentList"));
const ConsultationList = lazy(() => import("./pages/Consultations/ConsultationList"));
const ConsultationWorkspace = lazy(() => import("./pages/Consultations/ConsultationWorkspace"));
const VitalSigns = lazy(() => import("./pages/Consultations/VitalSigns"));
const LabModule = lazy(() => import("./pages/Laboratory/LabModule"));
const PrescriptionTerminal = lazy(() => import("./pages/Pharmacy/prescriptions/PrescriptionTerminal"));
const InventoryMatrix = lazy(() => import("./pages/Pharmacy/inventory/InventoryMatrix"));
const BillingAnalytics = lazy(() => import("./pages/Pharmacy/analytics/BillingAnalytics"));
const BillingOverview = lazy(() => import("./pages/Billing/BillingOverview"));
const InpatientOverview = lazy(() => import("./pages/Inpatient/InpatientOverview"));
const InventoryList = lazy(() => import("./pages/Inventory/InventoryList"));
const RadiologyModule = lazy(() => import("./pages/Radiology/RadiologyModule"));
const AccountingPage = lazy(() => import("./pages/Accounting/AccountingPage"));
const RegistriesPage = lazy(() => import("./pages/Accounting/registries/RegistriesPage"));
const LedgerPage = lazy(() => import("./pages/Accounting/ledger/LedgerPage"));
const BanksPage = lazy(() => import("./pages/Accounting/banks/BanksPage"));
const ReportsPage = lazy(() => import("./pages/Accounting/reports/ReportsPage"));
const Settings = lazy(() => import("./pages/Dashboard/Settings"));
const Profile = lazy(() => import("./pages/Dashboard/Profile"));
const StaffLayout = lazy(() => import("./pages/Staff/StaffLayout"));
const StaffList = lazy(() => import("./pages/Staff/StaffList"));
const StaffProfile = lazy(() => import("./pages/Staff/StaffProfile"));
const ReportsHub = lazy(() => import("./pages/Reports/ReportsHub"));
const ClinicalReports = lazy(() => import("./pages/Reports/ClinicalReports"));
const RevenueDashboard = lazy(() => import("./pages/Reports/Revenue/RevenueDashboard"));
const RevenueByServiceType = lazy(() => import("./pages/Reports/RevenueByServiceType/RevenueByServiceType"));
const ReferralReport = lazy(() => import("./pages/Reports/ReferralReport/ReferralReport"));

const IndividualPatients = () => <PatientList defaultCategory="Individual" />;
const CorporatePatients = () => <PatientList defaultCategory="Corporate" />;
const HmoPatients = () => <PatientList defaultCategory="HMO" />;
const WithStaffProvider = ({ children }: { children: React.ReactNode }) => (
  <StaffProvider>{children}</StaffProvider>
);

const PageLoading = () => (
  <div className="h-screen w-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
);

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster richColors />
        <TenantProvider>
          <AuthProvider>
            <AdminAuthProvider>
              <GlobalSettingsProvider>
              <Suspense fallback={<PageLoading />}>
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
                  <Route path="laboratory" element={<WithStaffProvider><LabModule /></WithStaffProvider>} />
                  <Route path="radiology" element={<RadiologyModule />} />
                  <Route path="pharmacy" element={<Navigate to="prescriptions" replace />} />
                  <Route path="pharmacy/prescriptions" element={<PrescriptionTerminal />} />
                  <Route path="pharmacy/inventory" element={<InventoryMatrix />} />
                  <Route path="pharmacy/analytics" element={<BillingAnalytics />} />
                  <Route path="billing" element={<WithStaffProvider><BillingOverview /></WithStaffProvider>} />
                  <Route path="accounting" element={<AccountingPage />} />
                  <Route path="accounting/registries" element={<RegistriesPage />} />
                  <Route path="accounting/ledger" element={<LedgerPage />} />
                  <Route path="accounting/banks" element={<BanksPage />} />
                  <Route path="accounting/reports" element={<ReportsPage />} />
                  <Route path="inventory" element={<InventoryList />} />
                  <Route path="inpatient" element={<WithStaffProvider><InpatientOverview /></WithStaffProvider>} />
                  <Route path="staff" element={<WithStaffProvider><StaffLayout /></WithStaffProvider>}>
                    <Route index element={<StaffList />} />
                    <Route path=":id" element={<StaffProfile />} />
                  </Route>
                  <Route path="reports" element={<ReportsHub />} />
                  <Route path="reports/clinical" element={<ClinicalReports />} />
                  <Route path="reports/revenue" element={<RevenueDashboard />} />
                  <Route path="reports/revenue-by-service-type" element={<RevenueByServiceType />} />
                  <Route path="reports/referrals" element={<ReferralReport />} />
                  <Route path="settings" element={<WithStaffProvider><Settings /></WithStaffProvider>} />
                  <Route path="profile" element={<Profile />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* Legacy redirects — preserve old flat URLs */}
                <Route path="/login" element={<Navigate to="/demo/login" replace />} />
                <Route path="/dashboard" element={<Navigate to="/demo/dashboard" replace />} />
                <Route path="/" element={<Navigate to="/demo/dashboard" replace />} />
                <Route path="*" element={<HospitalNotFound />} />
              </Routes>
              </Suspense>
              </GlobalSettingsProvider>
            </AdminAuthProvider>
          </AuthProvider>
        </TenantProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
