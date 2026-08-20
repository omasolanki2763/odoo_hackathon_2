import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

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

// Loading component
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '50vh',
    color: '#7dd3fc'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid #2a2f3a',
      borderTop: '3px solid #7dd3fc',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// Admin Protected Route Component
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
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
      <div className="app">
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 120px)' }}>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/items/:id" element={<ItemDetailPage />} />
              <Route path="/swaps/:id" element={
                <ProtectedRoute>
                  <SwapDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/add-item" element={
                <ProtectedRoute>
                  <AddItemPage />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              } />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
