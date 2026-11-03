import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Layout & Guards
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Public & Auth Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterHospitalPage from './pages/auth/RegisterHospitalPage';
import RegisterCollectorPage from './pages/auth/RegisterCollectorPage';
import ProfilePage from './pages/common/ProfilePage';

// Hospital Portal Pages
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import WasteManagementPage from './pages/hospital/WasteManagementPage';
import HospitalAuditPage from './pages/hospital/HospitalAuditPage';
import SchedulePickupPage from './pages/hospital/SchedulePickupPage';
import HospitalActivePickupPage from './pages/hospital/HospitalActivePickupPage';
import HospitalAnalyticsPage from './pages/hospital/HospitalAnalyticsPage';
import HospitalHistoryPage from './pages/hospital/HospitalHistoryPage';

// Collector Portal Pages
import CollectorDashboard from './pages/collector/CollectorDashboard';
import CollectorRoutePage from './pages/collector/CollectorRoutePage';
import AssignedPickupsPage from './pages/collector/AssignedPickupsPage';
import CollectorActivePickupPage from './pages/collector/CollectorActivePickupPage';
import CollectorHistoryPage from './pages/collector/CollectorHistoryPage';

// Admin Portal Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRouteOptimizationPage from './pages/admin/AdminRouteOptimizationPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import AdminHospitalsPage from './pages/admin/AdminHospitalsPage';
import AdminCollectorsPage from './pages/admin/AdminCollectorsPage';
import AdminPickupRequestsPage from './pages/admin/AdminPickupRequestsPage';
import AdminLiveTrackingPage from './pages/admin/AdminLiveTrackingPage';
import AdminAIAnalyticsPage from './pages/admin/AdminAIAnalyticsPage';
import AdminHistoryPage from './pages/admin/AdminHistoryPage';

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
            fontSize: '13px',
            fontWeight: 600,
          },
        }}
      />
      <Router>
        <Routes>
          {/* Public Routes with MainLayout */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register/hospital" element={<RegisterHospitalPage />} />
            <Route path="/register/collector" element={<RegisterCollectorPage />} />

            {/* Profile Route for all logged in users */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />

            {/* Hospital Portal Routes */}
            <Route 
              path="/hospital/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['hospital']}>
                  <HospitalDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/waste" 
              element={
                <ProtectedRoute allowedRoles={['hospital']}>
                  <WasteManagementPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/audit" 
              element={
                <ProtectedRoute allowedRoles={['hospital']}>
                  <HospitalAuditPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/schedule" 
              element={
                <ProtectedRoute allowedRoles={['hospital']}>
                  <SchedulePickupPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/active-pickup" 
              element={
                <ProtectedRoute allowedRoles={['hospital']}>
                  <HospitalActivePickupPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/analytics" 
              element={
                <ProtectedRoute allowedRoles={['hospital']}>
                  <HospitalAnalyticsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/history" 
              element={
                <ProtectedRoute allowedRoles={['hospital']}>
                  <HospitalHistoryPage />
                </ProtectedRoute>
              } 
            />

            {/* Collector Portal Routes */}
            <Route 
              path="/collector/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['collector']}>
                  <CollectorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/collector/route" 
              element={
                <ProtectedRoute allowedRoles={['collector']}>
                  <CollectorRoutePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/collector/assigned" 
              element={
                <ProtectedRoute allowedRoles={['collector']}>
                  <AssignedPickupsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/collector/active-pickup" 
              element={
                <ProtectedRoute allowedRoles={['collector']}>
                  <CollectorActivePickupPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/collector/history" 
              element={
                <ProtectedRoute allowedRoles={['collector']}>
                  <CollectorHistoryPage />
                </ProtectedRoute>
              } 
            />

            {/* Admin Portal Routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/route-optimization" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminRouteOptimizationPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/audit" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAuditPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/hospitals" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminHospitalsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/collectors" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCollectorsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/pickups" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPickupRequestsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/tracking" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLiveTrackingPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/analytics" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAIAnalyticsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/history" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminHistoryPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/ml-model" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAIAnalyticsPage />
                </ProtectedRoute>
              } 
            />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
