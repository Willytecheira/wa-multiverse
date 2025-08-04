import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '@/services/auth';

const Index = () => {
  useEffect(() => {
    // Initialize WebSocket connection and auth check
    authService.scheduleAutoLogout();
  }, []);

  if (authService.isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default Index;
