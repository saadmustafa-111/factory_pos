import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthToken, setAuthToken } from '../lib/api';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  // Check in-memory token first, then fall back to localStorage
  let token = getAuthToken();
  if (!token) {
    const stored = localStorage.getItem('factory_pos_token');
    if (stored) {
      setAuthToken(stored); // Restore into memory
      token = stored;
    }
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
