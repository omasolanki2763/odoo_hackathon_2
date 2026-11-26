import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { getToken, getStoredUser } from './utils/authStorage';

// Lazy load components for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ItemDetailPage = lazy(() => import('./pages/ItemDetailPage'));
const AddItemPage = lazy(() => import('./pages/AddItemPage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ItemsPage = lazy(() => import('./pages/ItemsPage'));
const SwapDetailPage = lazy(() => import('./pages/SwapDetailPage'));

const LoadingSpinner = () => (
  <div className="app-shell-loading" role="status" aria-label="Loading page">
    <div className="app-shell-spinner" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const token = getToken();
  const userData = getStoredUser() || {};

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!userData.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/swaps"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route
              path="/swaps/:id"
              element={
                <ProtectedRoute>
                  <SwapDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-item"
              element={
                <ProtectedRoute>
                  <AddItemPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;
