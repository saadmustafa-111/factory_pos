import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthToken } from '../lib/api';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const token = getAuthToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
