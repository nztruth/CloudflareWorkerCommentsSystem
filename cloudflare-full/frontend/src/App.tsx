import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import IndexPage from './pages/Index';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import ProjectPage from './pages/Project';
import ProjectSettingsPage from './pages/ProjectSettings';
import NotFoundPage from './pages/NotFound';
import ErrorPage from './pages/Error';
import GettingStartPage from './pages/GettingStart';
import ForbiddenPage from './pages/Forbidden';
import PrivacyPolicyPage from './pages/PrivacyPolicy';
import OpenApprovePage from './pages/OpenApprove';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route 
        path="/dashboard" 
        element={user ? <DashboardPage /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/dashboard/project/:projectId" 
        element={user ? <ProjectPage /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/dashboard/project/:projectId/settings" 
        element={user ? <ProjectSettingsPage /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/getting-start" 
        element={user ? <GettingStartPage /> : <Navigate to="/login" />} 
      />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/open/approve" element={<OpenApprovePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;