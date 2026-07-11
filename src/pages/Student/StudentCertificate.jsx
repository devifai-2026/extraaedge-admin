// Student Certificate — shows completion requirements, lets an eligible student
// claim their certificate, then renders a premium certificate they can download
// as a PDF (reusing the html2canvas + jsPDF pipeline used for receipts).
import { useEffect, useState } from 'react';
import { studentApi, studentAuth } from '../../lib/studentApi';
import { PageHeader, Card, Skeleton, Btn, Toast, ACCENT } from '../../lib/lmsUi';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { downloadHtmlAsPdf } from '../../lib/htmlToPdf';

const fmtDate = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return ''; } };

export default function StudentCertificate() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const tenant = studentAuth.getTenant();

  const load = () => studentApi.certificate().then((r) => setData(r?.data ?? r)).catch((e) => setToast(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const orgName = tenant?.name || 'Institute';
  const issued = data?.issued;

  const download = async () => {
    const html = certHtml({ orgName, studentName: data.student_name, programName: data.program_name, number: issued.certificate_number, date: fmtDate(issued.issued_at), meta: issued.meta || {} });
    try { await downloadHtmlAsPdf(html, `certificate-${issued.certificate_number}.pdf`, { width: 1100 }); }
    catch (e) { setToast(e.message || 'Could not generate PDF'); }
  };

  if (loading) return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader title="Certificate" subtitle="Your course-completion certificate." icon={WorkspacePremiumIcon} />
      <Card><Skeleton h={18} w="50%" /><div style={{ height: 10 }} /><Skeleton h={12} w="70%" /></Card>
    </div>
  );

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader title="Certificate" subtitle={data?.program_name || 'Your course-completion certificate.'} icon={WorkspacePremiumIcon} />

      {issued ? (
        <>
          <Card style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            <div dangerouslySetInnerHTML={{ __html: certHtml({ orgName, studentName: data.student_name, programName: data.program_name, number: issued.certificate_number, date: fmtDate(issued.issued_at), meta: issued.meta || {}, embedded: true }) }} />
          </Card>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Btn onClick={download}>⬇ Download PDF</Btn>
          </div>
        </>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <div style={{ fontSize: 46 }}>🎓</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>{data?.eligible ? 'You are ready to graduate!' : 'Almost there'}</div>
            <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 4, maxWidth: 460, margin: '4px auto 0' }}>
              Your certificate is issued automatically by {orgName} once you complete the course — no action needed. Here&apos;s your progress:
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, maxWidth: 460, margin: '0 auto 8px' }}>
            {(data?.requirements || []).map((req) => (
              <div key={req.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: `1px solid ${req.met ? '#bbf7d0' : '#e2e8f0'}`, background: req.met ? '#f0fdf4' : '#fff' }}>
                {req.met ? <CheckCircleIcon sx={{ color: '#16a34a' }} /> : <RadioButtonUncheckedIcon sx={{ color: '#cbd5e1' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>{req.label}</div>
                  {req.detail && <div style={{ fontSize: 12, color: '#94a3b8' }}>{req.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}

// The certificate document — used both for the on-screen preview (embedded) and
// the downloaded PDF. Self-contained inline styles so html2canvas captures it.
function certHtml({ orgName, studentName, programName, number, date, meta, embedded }) {
  const accent = '#E53935';
  return `
  <div style="width:100%;box-sizing:border-box;background:#fbfbfd;padding:${embedded ? '28px' : '48px'};font-family:Georgia,'Times New Roman',serif;color:#0f172a;">
    <div style="border:2px solid ${accent};border-radius:14px;padding:38px 44px;background:linear-gradient(160deg,#ffffff 0%,#fff7f6 100%);position:relative;">
      <div style="position:absolute;top:18px;right:22px;font-size:40px;">🏅</div>
      <div style="text-transform:uppercase;letter-spacing:4px;font-size:12px;color:${accent};font-weight:700;font-family:Arial,sans-serif;">${escapeHtml(orgName)}</div>
      <div style="font-size:30px;font-weight:800;margin-top:14px;letter-spacing:-0.5px;">Certificate of Completion</div>
      <div style="font-size:13px;color:#64748b;margin-top:16px;font-family:Arial,sans-serif;">This is proudly presented to</div>
      <div style="font-size:34px;font-weight:800;color:${accent};margin:8px 0 4px;">${escapeHtml(studentName || 'Student')}</div>
      <div style="width:120px;height:2px;background:${accent};opacity:0.4;margin:6px 0 18px;"></div>
      <div style="font-size:14px;color:#334155;line-height:1.7;font-family:Arial,sans-serif;max-width:620px;">
        for successfully completing the course
        <b style="color:#0f172a;">${escapeHtml(programName || '')}</b>${meta && meta.attendance_pct != null ? `, with an attendance of <b>${meta.attendance_pct}%</b>` : ''}.
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:38px;font-family:Arial,sans-serif;">
        <div>
          <div style="font-size:12px;color:#94a3b8;">Certificate No.</div>
          <div style="font-size:14px;font-weight:700;letter-spacing:1px;">${escapeHtml(number || '')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:#94a3b8;">Issued on</div>
          <div style="font-size:14px;font-weight:700;">${escapeHtml(date || '')}</div>
        </div>
      </div>
    </div>
  </div>`;
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
