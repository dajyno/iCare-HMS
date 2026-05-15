import React from "react";
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Auth/Login";
import Overview from "./pages/Dashboard/Overview";
import PatientList from "./pages/Patients/PatientList";
import PatientProfile from "./pages/Patients/PatientProfile";
import FamilyPatients from "./pages/Patients/FamilyPatients";
import AppointmentList from "./pages/Appointments/AppointmentList";
import ConsultationWorkspace from "./pages/Consultations/ConsultationWorkspace";
import VitalSigns from "./pages/Consultations/VitalSigns";
import LabQueue from "./pages/Laboratory/LabQueue";
import PharmacyQueue from "./pages/Pharmacy/PharmacyQueue";
import BillingOverview from "./pages/Billing/BillingOverview";
import InpatientOverview from "./pages/Inpatient/InpatientOverview";
import InventoryList from "./pages/Inventory/InventoryList";
import RadiologyPage from "./pages/Radiology/RadiologyPage";
import AccountingPage from "./pages/Accounting/AccountingPage";
import Settings from "./pages/Dashboard/Settings";
import Profile from "./pages/Dashboard/Profile";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const StaffList = () => <div className="p-6">Staff List Placeholder</div>;
const ReportsOverview = () => <div className="p-6">Reports Overview Placeholder</div>;
const IndividualPatients = () => <PatientList defaultCategory="Individual" />;
const CorporatePatients = () => <PatientList defaultCategory="Corporate" />;
const HmoPatients = () => <PatientList defaultCategory="HMO" />;

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  return <DashboardLayout>{children}</DashboardLayout>;
};

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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
                  <Navigate to="/consultations/workspace" replace />
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
                  <LabQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/radiology"
              element={
                <ProtectedRoute>
                  <RadiologyPage />
                </ProtectedRoute>
              }
            />
             <Route
              path="/pharmacy"
              element={
                <ProtectedRoute>
                  <PharmacyQueue />
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
                  <StaffList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsOverview />
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
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
