export function getToken() {
  return localStorage.getItem('token');
}

export function setSession(token, user) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
}

export function getUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Vite 개발 시 비워두면(기본값) `/api` → 프록시로 백엔드. preview/배포 시 `http://localhost:3000` 등 백엔드 origin만 지정 */
function apiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE;
  return typeof raw === 'string' ? raw.replace(/\/$/, '') : '';
}

function resolveApiUrl(path) {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = apiBaseUrl();
  if (base) return `${base}/api${p}`;
  return `/api${p}`;
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const url = resolveApiUrl(path);
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    let msg =
      data?.error ||
      (Array.isArray(data?.errors) && data.errors[0]?.msg) ||
      (typeof data === 'string' && data.trim()) ||
      res.statusText;
    if (res.status === 404 && (!msg || msg === 'Not Found')) {
      msg =
        'API를 찾을 수 없습니다. 백엔드가 http://localhost:3000 에서 실행 중인지, 프론트는 npm run dev(5173)로 여는지 확인하세요.';
    }
    const err = new Error(msg || '요청 실패');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function fetchReceiptBlobUrl(claimId) {
  const token = getToken();
  const res = await fetch(resolveApiUrl(`/claims/${claimId}/receipt`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('영수증을 불러올 수 없습니다.');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
