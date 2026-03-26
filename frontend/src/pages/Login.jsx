import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setSession } from '../api';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(data.token, data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/app', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand" aria-hidden>
          ✦
        </div>
        <h1 className="login-title">로그인</h1>
        <p className="login-subtitle">재정 청구 시스템에 로그인하여 예산·청구를 관리하세요.</p>
        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">
              이메일
            </label>
            <input
              id="login-email"
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="name@example.com"
            />
          </div>
          <div className="login-field">
            <label className="login-label" htmlFor="login-password">
              비밀번호
            </label>
            <input
              id="login-password"
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? '처리 중…' : '로그인'}
          </button>
        </form>
        <p className="login-footer">
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
