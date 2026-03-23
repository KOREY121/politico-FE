import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/useAuth';
import LoginPage    from './pages/LoginPage';
import VotePage     from './pages/VotePage';
import ResultsPage  from './pages/ResultsPage';
import AdminPage    from './pages/AdminPage';

function ProtectedRoute({ children }) {
  const { voter } = useAuth();
  return voter ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  const { voter, isAdmin } = useAuth();
  if (!voter)   return <Navigate to="/"     replace />;
  if (!isAdmin) return <Navigate to="/vote" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"        element={<LoginPage />} />
      <Route path="/vote"    element={<ProtectedRoute><VotePage /></ProtectedRoute>} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/admin"   element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}