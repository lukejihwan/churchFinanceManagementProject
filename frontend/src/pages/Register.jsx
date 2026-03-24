import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName, email, password }),
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '48px auto', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
      <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>예산 청구자 회원가입</h1>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>이름</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>비밀번호 (8자 이상)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #ccc' }}
        />
        {error && <p style={{ color: '#b91c1c', fontSize: 14 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            background: '#1e3a5f',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? '처리 중…' : '가입하기'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        이미 계정이 있으면 <Link to="/login">로그인</Link>
      </p>
    </div>
  );
}
