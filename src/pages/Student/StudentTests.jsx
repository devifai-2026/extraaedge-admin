// Student Tests — list published tests with your score; take an un-attempted
// test (one attempt, auto-scored on submit).
import { useEffect, useState, useCallback } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Badge, Btn, Skeleton, Progress } from '../../lib/lmsUi';
import QuizIcon from '@mui/icons-material/QuizOutlined';

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

  if (loading) return (
    <div>
      <PageHeader title="Mock Tests" subtitle="Attempt published tests and track your scores." icon={QuizIcon} />
      <Card><Skeleton h={16} w="50%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
    </div>
  );

  if (taking) {
    const totalQ = (taking.questions || []).length;
    const answeredCount = answers.filter((a) => a != null).length;
    return (
      <div>
        <h2 style={{ fontSize: 20, color: '#0f172a' }}>{taking.title}</h2>
        <div style={{ margin: '0 0 16px' }}>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Answered {answeredCount} of {totalQ}</div>
          <Progress value={totalQ ? (answeredCount / totalQ) * 100 : 0} />
        </div>
        {(taking.questions || []).map((q, i) => (
          <Card key={i} pad={16} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{i + 1}. {q.q} <span style={{ color: '#94a3b8', fontSize: 12 }}>({q.marks} marks)</span></div>
            <div style={{ display: 'grid', gap: 6 }}>
              {(q.options || []).map((o, oi) => (
                <label key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name={`q${i}`} checked={answers[i] === oi} onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? oi : v)))} />
                  {o}
                </label>
              ))}
            </div>
          </Card>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={submit}>Submit test</Btn>
          <Btn variant="ghost" onClick={() => setTaking(null)}>Cancel</Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Mock Tests" subtitle="Attempt published tests and track your scores." icon={QuizIcon} />
      {result && <div style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: 12, marginBottom: 12, fontWeight: 600 }}>You scored {result.score} / {result.total_marks}</div>}
      {tests.length === 0 ? <Card><EmptyState icon="📝" title="No tests yet" text="Published mock tests will show up here — check back after your trainer adds one." /></Card> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {tests.map((t) => (
            <Card key={t.id} pad={14} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.title}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{t.module_name ? `${t.module_name} · ` : ''}{t.total_marks} marks</div>
              </div>
              {t.my_submitted_at
                ? <Badge tone="success">Scored {t.my_score}/{t.total_marks}</Badge>
                : <Btn size="sm" onClick={() => start(t.id)}>Take test</Btn>}
            </Card>
          ))}
        </div>
      )}
      {toast && <div style={toastBox} onClick={() => setToast('')}>{toast}</div>}
    </div>
  );
}

const toastBox = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', zIndex: 50 };
