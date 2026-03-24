import { useEffect, useState } from 'react';
import { api } from '../api';

function money(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString('ko-KR') : n;
}

export default function ClaimantDashboard() {
  const year = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(year);
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [budgetItemId, setBudgetItemId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr('');
    try {
      const q = new URLSearchParams();
      q.set('fiscal_year', String(fiscalYear));
      const [list, mine] = await Promise.all([
        api(`/budget-items?${q.toString()}`),
        api('/claims'),
      ]);
      setItems(list);
      setClaims(mine);
      setBudgetItemId((prev) => {
        if (!list.length) return '';
        const ok = list.some((x) => String(x.id) === String(prev));
        return ok ? prev : String(list[0].id);
      });
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');
    setErr('');
    if (!file) {
      setErr('영수증 이미지를 선택해 주세요.');
      return;
    }
    const fd = new FormData();
    fd.append('budget_item_id', budgetItemId);
    fd.append('amount', amount);
    if (description) fd.append('description', description);
    fd.append('receipt', file);
    setLoading(true);
    try {
      await api('/claims', { method: 'POST', body: fd });
      setMsg('청구가 접수되었습니다. (승인 전까지 예산에서 차감되지 않습니다.)');
      setAmount('');
      setDescription('');
      setFile(null);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>예산 항목별 남은 예산</h2>
        <p style={{ fontSize: 14, color: '#555', marginTop: 0 }}>
          승인된 청구만 합산됩니다. 대기 중인 청구는 아래 &quot;내 청구 내역&quot;에서 확인하세요.
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, marginRight: 8 }}>회계연도</label>
          <input
            type="number"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            min={2000}
            max={2100}
            style={{ padding: 6, width: 100, borderRadius: 6, border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>항목</th>
                <th style={{ padding: 10 }}>총 예산</th>
                <th style={{ padding: 10 }}>남은 예산</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 16, color: '#666' }}>
                    등록된 예산 항목이 없습니다. 관리자에게 문의하세요.
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{row.name}</td>
                  <td style={{ padding: 10 }}>{money(row.total_amount)}원</td>
                  <td style={{ padding: 10, fontWeight: 600 }}>{money(row.remaining_amount)}원</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>새 청구</h2>
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#fff',
            padding: 20,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            maxWidth: 480,
          }}
        >
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>청구 항목</label>
          <select
            value={budgetItemId}
            onChange={(e) => setBudgetItemId(e.target.value)}
            required
            style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #ccc' }}
          >
            {items.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.fiscal_year}년)
              </option>
            ))}
          </select>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>청구 금액 (원)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #ccc' }}
          />
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>설명 (선택)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #ccc' }}
          />
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>영수증 이미지</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ marginBottom: 16 }}
          />
          {err && <p style={{ color: '#b91c1c', fontSize: 14 }}>{err}</p>}
          {msg && <p style={{ color: '#15803d', fontSize: 14 }}>{msg}</p>}
          <button
            type="submit"
            disabled={loading || items.length === 0}
            style={{
              padding: '10px 20px',
              background: '#1e3a5f',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'wait' : 'pointer',
              fontWeight: 600,
            }}
          >
            {loading ? '제출 중…' : '청구 제출'}
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>내 청구 내역</h2>
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>일시</th>
                <th style={{ padding: 10 }}>항목</th>
                <th style={{ padding: 10 }}>금액</th>
                <th style={{ padding: 10 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 16, color: '#666' }}>
                    제출한 청구가 없습니다.
                  </td>
                </tr>
              )}
              {claims.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: 10, whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at).toLocaleString('ko-KR')}
                  </td>
                  <td style={{ padding: 10 }}>{c.budget_item_name}</td>
                  <td style={{ padding: 10 }}>{money(c.amount)}원</td>
                  <td style={{ padding: 10 }}>
                    {c.status === 'pending' && '대기'}
                    {c.status === 'approved' && '승인'}
                    {c.status === 'rejected' && '반려'}
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
