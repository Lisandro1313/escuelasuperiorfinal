import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/Landing/LandingPage';
import Login from './components/Auth/Login';
import Register from './pages/Register';
import Dashboard from './components/Dashboard/Dashboard';
import CourseCatalog from './components/Courses/CourseCatalog';
import CourseDetail from './components/Courses/CourseDetail';
import CourseManagement from './components/CourseManagement';
import CourseViewer from './components/Student/CourseViewer';
import PaymentPage from './components/Payment/PaymentPage';
import { PaymentSuccess, PaymentFailure, PaymentPending } from './components/Payment/PaymentResults';
import UsersManagement from './pages/UsersManagement';
import MisEstudiantes from './pages/MisEstudiantes';
import Profile from './components/Profile/Profile';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import Navbar from './components/Layout/Navbar';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen">
        {isAuthenticated && <Navbar />}

        <Routes>
          <Route path="/" element={!isAuthenticated ? <LandingPage /> : <Navigate to="/dashboard" />} />
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />

          {/* Auth required */}
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/courses" element={<CourseCatalog />} />
          <Route path="/course/:id" element={<CourseDetail />} />
          <Route path="/course/:id/manage" element={isAuthenticated ? <CourseManagement /> : <Navigate to="/login" />} />
          <Route path="/course/:id/view" element={isAuthenticated ? <CourseViewer /> : <Navigate to="/login" />} />
          <Route path="/course/:courseId/payment" element={isAuthenticated ? <PaymentPage /> : <Navigate to="/login" />} />
          <Route path="/payment/success" element={isAuthenticated ? <PaymentSuccess /> : <Navigate to="/login" />} />
          <Route path="/payment/failure" element={isAuthenticated ? <PaymentFailure /> : <Navigate to="/login" />} />
          <Route path="/payment/pending" element={isAuthenticated ? <PaymentPending /> : <Navigate to="/login" />} />

          {/* Profe + admin */}
          <Route path="/students" element={isAuthenticated ? <MisEstudiantes /> : <Navigate to="/login" />} />

          {/* Admin */}
          <Route path="/admin" element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/admin/users" element={isAuthenticated ? <UsersManagement /> : <Navigate to="/login" />} />

          {/* Perfil */}
          <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />

          {/* Catch-all: vuelve a home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
