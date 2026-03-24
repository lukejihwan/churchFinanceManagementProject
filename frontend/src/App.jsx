import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { getUser, setSession } from './api';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ClaimantDashboard from './pages/ClaimantDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function Layout({ children, title }) {
  const navigate = useNavigate();
  const user = getUser();

  function logout() {
    setSession(null, null);
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: '#1e3a5f',
          color: '#fff',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 700 }}>{title}</div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}>
            <span>
              {user.full_name} ({user.role === 'admin' ? '관리자' : '청구자'})
            </span>
            {user.role === 'admin' && (
              <Link to="/admin" style={{ color: '#93c5fd' }}>
                관리
              </Link>
            )}
            {user.role === 'claimant' && (
              <Link to="/app" style={{ color: '#93c5fd' }}>
                내 청구
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,.5)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              로그아웃
            </button>
          </div>
        )}
      </header>
      <main style={{ flex: 1, padding: 20, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}

function PrivateRoute({ children, role }) {
  const user = getUser();
  const token = localStorage.getItem('token');
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <PrivateRoute role="claimant">
            <Layout title="교회 재정 청구">
              <ClaimantDashboard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute role="admin">
            <Layout title="재정 관리 (관리자)">
              <AdminDashboard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
