import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireEditor?: boolean;
  requireSupporteur?: boolean;
  requireStaff?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireEditor = false, requireSupporteur = false, requireStaff = false }: ProtectedRouteProps) {
  const { currentUser, userProfile, loading, isAdmin, isEditor, isSupporteur } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireEditor && !isEditor()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSupporteur && !isSupporteur()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireStaff && !isAdmin() && !isEditor() && !isSupporteur()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
