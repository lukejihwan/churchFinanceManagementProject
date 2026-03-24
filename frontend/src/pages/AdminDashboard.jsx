import { useEffect, useState } from 'react';
import { api, fetchReceiptBlobUrl } from '../api';

function money(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString('ko-KR') : n;
}

function ReceiptPreview({ claimId }) {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let url;
    (async () => {
      try {
        url = await fetchReceiptBlobUrl(claimId);
        setSrc(url);
      } catch (e) {
        setErr(e.message);
      }
    })();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [claimId]);

  if (err) return <span style={{ color: '#b91c1c', fontSize: 12 }}>{err}</span>;
  if (!src) return <span style={{ fontSize: 12 }}>로딩…</span>;
  return (
    <a href={src} target="_blank" rel="noreferrer">
      <img src={src} alt="영수증" style={{ maxHeight: 80, borderRadius: 4, border: '1px solid #ddd' }} />
    </a>
  );
}

export default function AdminDashboard() {
  const year = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(year);
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [name, setName] = useState('');
  const [itemYear, setItemYear] = useState(year);
  const [totalAmount, setTotalAmount] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try {
      const q = new URLSearchParams();
      q.set('fiscal_year', String(fiscalYear));
      const [list, allClaims] = await Promise.all([
        api(`/budget-items?${q.toString()}`),
        api('/claims'),
      ]);
      setItems(list);
      setClaims(allClaims);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear]);

  function startEdit(row) {
    setEditingId(row.id);
    setName(row.name);
    setItemYear(row.fiscal_year);
    setTotalAmount(String(row.total_amount));
    setItemDesc(row.description || '');
    setMsg('');
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
    setItemYear(year);
    setTotalAmount('');
    setItemDesc('');
  }

  async function saveItem(e) {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      if (editingId) {
        await api(`/budget-items/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            fiscal_year: itemYear,
            total_amount: Number(totalAmount),
            description: itemDesc || null,
          }),
        });
        setMsg('항목이 수정되었습니다.');
      } else {
        await api('/budget-items', {
          method: 'POST',
          body: JSON.stringify({
            name,
            fiscal_year: itemYear,
            total_amount: Number(totalAmount),
            description: itemDesc || null,
          }),
        });
        setMsg('항목이 추가되었습니다.');
      }
      cancelEdit();
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function removeItem(id) {
    if (!window.confirm('이 항목을 삭제할까요? (청구 내역이 있으면 삭제되지 않습니다.)')) return;
    setErr('');
    try {
      await api(`/budget-items/${id}`, { method: 'DELETE' });
      setMsg('삭제되었습니다.');
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function setClaimStatus(id, status) {
    setErr('');
    try {
      await api(`/claims/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      {err && (
        <p style={{ color: '#b91c1c', padding: 12, background: '#fef2f2', borderRadius: 8 }}>{err}</p>
      )}
      {msg && (
        <p style={{ color: '#15803d', padding: 12, background: '#f0fdf4', borderRadius: 8 }}>{msg}</p>
      )}

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>예산 항목 (청구 항목)</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, marginRight: 8 }}>조회 연도</label>
          <input
            type="number"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            min={2000}
            max={2100}
            style={{ padding: 6, width: 100, borderRadius: 6, border: '1px solid #ccc' }}
          />
        </div>

        <form
          onSubmit={saveItem}
          style={{
            background: '#fff',
            padding: 20,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            marginBottom: 16,
            display: 'grid',
            gap: 12,
            maxWidth: 560,
          }}
        >
          <strong>{editingId ? '항목 수정' : '새 항목 추가'}</strong>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>항목명</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>회계연도</label>
            <input
              type="number"
              value={itemYear}
              onChange={(e) => setItemYear(Number(e.target.value))}
              min={2000}
              max={2100}
              required
              style={{ width: 160, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>배정 예산 (원)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>설명 (선택)</label>
            <textarea
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                background: '#1e3a5f',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {editingId ? '저장' : '추가'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} style={{ padding: '8px 16px', borderRadius: 8 }}>
                취소
              </button>
            )}
          </div>
        </form>

        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>항목</th>
                <th style={{ padding: 10 }}>연도</th>
                <th style={{ padding: 10 }}>총 예산</th>
                <th style={{ padding: 10 }}>남은 예산</th>
                <th style={{ padding: 10 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{row.name}</td>
                  <td style={{ padding: 10 }}>{row.fiscal_year}</td>
                  <td style={{ padding: 10 }}>{money(row.total_amount)}원</td>
                  <td style={{ padding: 10 }}>{money(row.remaining_amount)}원</td>
                  <td style={{ padding: 10, whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => startEdit(row)} style={{ marginRight: 8 }}>
                      수정
                    </button>
                    <button type="button" onClick={() => removeItem(row.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>청구 검토</h2>
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>일시</th>
                <th style={{ padding: 8 }}>청구자</th>
                <th style={{ padding: 8 }}>항목</th>
                <th style={{ padding: 8 }}>금액</th>
                <th style={{ padding: 8 }}>상태</th>
                <th style={{ padding: 8 }}>영수증</th>
                <th style={{ padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #eee', verticalAlign: 'top' }}>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at).toLocaleString('ko-KR')}
                  </td>
                  <td style={{ padding: 8 }}>
                    {c.claimant_name}
                    <br />
                    <span style={{ color: '#666', fontSize: 12 }}>{c.claimant_email}</span>
                  </td>
                  <td style={{ padding: 8 }}>{c.budget_item_name}</td>
                  <td style={{ padding: 8 }}>{money(c.amount)}원</td>
                  <td style={{ padding: 8 }}>
                    {c.status === 'pending' && '대기'}
                    {c.status === 'approved' && '승인'}
                    {c.status === 'rejected' && '반려'}
                  </td>
                  <td style={{ padding: 8 }}>
                    <ReceiptPreview claimId={c.id} />
                  </td>
                  <td style={{ padding: 8 }}>
                    {c.status === 'pending' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button type="button" onClick={() => setClaimStatus(c.id, 'approved')}>
                          승인
                        </button>
                        <button type="button" onClick={() => setClaimStatus(c.id, 'rejected')}>
                          반려
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
