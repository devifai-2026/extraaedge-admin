// Student Tests — list published tests with your score; take an un-attempted
// test (one attempt, auto-scored on submit).
import { useEffect, useState, useCallback } from 'react';
import { studentApi } from '../../lib/studentApi';

export default function StudentTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taking, setTaking] = useState(null); // { id, title, questions, total_marks }
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');

  const load = useCallback(() => { studentApi.tests().then((r) => setTests(r?.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const start = async (id) => {
    try {
      const r = await studentApi.takeTest(id); const t = r?.data ?? r;
      if (t.already_attempted) { setToast(`Already attempted — score ${t.my_score}`); return; }
      setTaking(t); setAnswers(new Array((t.questions || []).length).fill(null)); setResult(null);
    } catch (e) { setToast(e.message); }
  };
  const submit = async () => {
    try { const r = await studentApi.submitTest(taking.id, answers); const res = r?.data ?? r; setResult(res); setTaking(null); load(); }
    catch (e) { setToast(e.message); }
  };

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading tests…</p>;

  if (taking) {
    return (
      <div>
        <h2 style={{ fontSize: 20, color: '#0f172a' }}>{taking.title}</h2>
        {(taking.questions || []).map((q, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{i + 1}. {q.q} <span style={{ color: '#94a3b8', fontSize: 12 }}>({q.marks} marks)</span></div>
            <div style={{ display: 'grid', gap: 6 }}>
              {(q.options || []).map((o, oi) => (
                <label key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name={`q${i}`} checked={answers[i] === oi} onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? oi : v)))} />
                  {o}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submit} style={btn}>Submit test</button>
          <button onClick={() => setTaking(null)} style={btnGhost}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, color: '#0f172a', margin: '0 0 12px' }}>Mock Tests</h2>
      {result && <div style={{ background: '#f0fdf4', color: '#15803d', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontWeight: 600 }}>You scored {result.score} / {result.total_marks}</div>}
      {tests.length === 0 ? <div style={{ color: '#94a3b8' }}>No tests yet.</div> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {tests.map((t) => (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.title}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{t.module_name ? `${t.module_name} · ` : ''}{t.total_marks} marks</div>
              </div>
              {t.my_submitted_at
                ? <span style={{ color: '#15803d', fontWeight: 600, fontSize: 14 }}>Scored {t.my_score}/{t.total_marks}</span>
                : <button onClick={() => start(t.id)} style={btn}>Take test</button>}
            </div>
          ))}
        </div>
      )}
      {toast && <div style={toastBox} onClick={() => setToast('')}>{toast}</div>}
    </div>
  );
}

const btn = { background: '#E53935', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnGhost = { background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer' };
const toastBox = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', zIndex: 50 };
