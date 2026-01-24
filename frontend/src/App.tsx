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
import FileManager from './components/FileUpload/FileManager';
import Calendar from './components/Calendar/Calendar';
import VideoPlayerPage from './pages/VideoPlayerPage';
import EvaluationSystemPage from './pages/EvaluationSystemPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CertificatesPage from './pages/CertificatesPage';
import ForumPage from './pages/ForumPage';
import GamificationPage from './pages/GamificationPage';
import UsersManagement from './pages/UsersManagement';
import AboutSystemPage from './pages/AboutSystemPage';
import Profile from './components/Profile/Profile';
import MisClases from './pages/MisClases';
import MiProgreso from './pages/MiProgreso';
import MisPagos from './pages/MisPagos';
import Calendario from './pages/Calendario';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { StudentProgressTracker } from './components/Student/StudentProgressTracker';
import { PaymentSuccess, PaymentFailure, PaymentPending } from './components/Payment/PaymentResults';
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
        {isAuthenticated && <div className="bg-gray-50"><Navbar /></div>}
        
        <Routes>
          <Route 
            path="/" 
            element={!isAuthenticated ? <LandingPage /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/register" 
            element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <div className="bg-gray-50"><Dashboard /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/courses" 
            element={isAuthenticated ? <div className="bg-gray-50"><CourseCatalog /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/course/:id" 
            element={isAuthenticated ? <div className="bg-gray-50"><CourseDetail /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/course/:id/manage" 
            element={isAuthenticated ? <div className="bg-gray-50"><CourseManagement /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/course/:id/view" 
            element={isAuthenticated ? <div className="bg-gray-50"><CourseViewer /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/course/:courseId/payment" 
            element={isAuthenticated ? <div className="bg-gray-50"><PaymentPage /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/files" 
            element={isAuthenticated ? <div className="bg-gray-50"><FileManager /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/calendar" 
            element={isAuthenticated ? <div className="bg-gray-50"><Calendar /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/video-player" 
            element={isAuthenticated ? <div className="bg-gray-50"><VideoPlayerPage /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/evaluations" 
            element={isAuthenticated ? <div className="bg-gray-50"><EvaluationSystemPage /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/analytics" 
            element={isAuthenticated ? <div className="bg-gray-50"><AnalyticsPage /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/certificados" 
            element={isAuthenticated ? <div className="bg-gray-50"><CertificatesPage /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/foros" 
            element={isAuthenticated ? <div className="bg-gray-50"><ForumPage /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/gamificacion" 
            element={isAuthenticated ? <div className="bg-gray-50"><GamificationPage /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/about-system" 
            element={isAuthenticated ? <div className="bg-gray-50"><AboutSystemPage /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/profile" 
            element={isAuthenticated ? <div className="bg-gray-50"><Profile /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/mis-clases" 
            element={isAuthenticated ? <div className="bg-gray-50"><MisClases /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/mi-progreso" 
            element={isAuthenticated ? <div className="bg-gray-50"><MiProgreso /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/pagos" 
            element={isAuthenticated ? <div className="bg-gray-50"><MisPagos /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/calendario" 
            element={isAuthenticated ? <div className="bg-gray-50"><Calendario /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin/users" 
            element={isAuthenticated ? <div className="bg-gray-50"><UsersManagement /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin" 
            element={isAuthenticated ? <div className="bg-gray-50"><AdminDashboard /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/progreso" 
            element={isAuthenticated ? <div className="bg-gray-50"><StudentProgressTracker /></div> : <Navigate to="/login" />} 
          />
          <Route 
            path="/payment/success" 
            element={isAuthenticated ? <PaymentSuccess /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/payment/failure" 
            element={isAuthenticated ? <PaymentFailure /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/payment/pending" 
            element={isAuthenticated ? <PaymentPending /> : <Navigate to="/login" />} 
          />
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