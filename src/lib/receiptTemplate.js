// Shared fee-receipt HTML builder — the SINGLE source of truth for the receipt
// layout. Both the public share page (/r/:token, printed via window.print) and
// the admin "Download PDF" (html2canvas + jsPDF) feed the same payload here so
// the two can never drift.
//
// Layout mirrors the organisation's "FEE RECEIPT" template:
//   header band (logo + address + phone|website  |  FEE RECEIPT + no/date/center)
//   STUDENT DETAILS (2-col)
//   PAYMENT SUMMARY card (Course Fees / Amount Paid Today / Payment Mode /
//                         Remaining[red] / Paid Till Date)
//   UPCOMING INSTALLMENT SCHEDULE (dark-header table; unpaid rows only)
//   footer band (configurable terms + Thank-you + system-generated / signatory)
//
// Everything is table-based + inline-styled so html2canvas snapshots it
// faithfully, and sized to fit a single A4 page.
import { resolveAssetUrl } from './config';

const CURRENCY_SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const fmtDate = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

// Compose the tenant address into one line from whatever parts exist.
const addressLine = (t) => [t.address_line1, t.address_line2, t.city, t.state, t.pincode]
  .map((x) => (x == null ? '' : String(x).trim()))
  .filter(Boolean)
  .join(', ');

// Compose "phone  |  website" from whatever exists.
const contactLine = (t) => [t.phone, t.website].filter(Boolean).map(esc).join('&nbsp;&nbsp;|&nbsp;&nbsp;');

/**
 * Build the receipt as a self-contained HTML string.
 * @param {object} data - the /public/receipts/:token payload
 *   ({ receipt, admission, tenant, fee_schedule, upcoming }).
 * @param {object} [opts] - { accent } override for the accent colour.
 */
export function buildReceiptHtml(data, opts = {}) {
  const { receipt = {}, admission = {}, tenant = {}, fee_schedule = {}, upcoming = [] } = data || {};
  const totals = fee_schedule.totals || { total: 0, paid: 0, due: 0 };
  const accent = opts.accent || tenant.brand_primary_color || '#E53935';
  const sym = CURRENCY_SYMBOL[tenant.currency] || '₹';
  const money = (n) => (n == null ? '—' : `${sym}${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);

  const brandName = tenant.brand_name || tenant.name || 'Fee Receipt';
  const logoSrc = tenant.logo_url ? resolveAssetUrl(tenant.logo_url) : null;
  const addr = addressLine(tenant);
  const contact = contactLine(tenant);

  // --- Header: left brand block, right FEE RECEIPT meta ---
  const logoCell = logoSrc
    ? `<img src="${esc(logoSrc)}" alt="${esc(brandName)}" crossorigin="anonymous"
           style="height:64px;max-width:220px;object-fit:contain;display:block;background:#0f172a;border-radius:6px;padding:6px" />`
    : `<div style="font-size:22px;font-weight:800;color:#0f172a">${esc(brandName)}</div>`;

  const header = `
    <table style="width:100%;border-collapse:collapse;table-layout:fixed">
      <tr>
        <td style="width:58%;vertical-align:top;padding:0 12px 0 0;word-break:break-word;overflow-wrap:anywhere">
          ${logoCell}
          ${addr ? `<div style="margin-top:10px;font-size:11px;color:#334155;font-weight:600;word-break:break-word;overflow-wrap:anywhere">${esc(addr)}</div>` : ''}
          ${contact ? `<div style="margin-top:3px;font-size:11px;color:#64748b;word-break:break-word;overflow-wrap:anywhere">${contact}</div>` : ''}
        </td>
        <td style="width:42%;vertical-align:top;text-align:right;padding:0;word-break:break-word;overflow-wrap:anywhere">
          <span style="display:inline-block;background:#0f172a;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;padding:7px 14px;border-radius:4px;white-space:nowrap">FEE RECEIPT</span>
          <div style="margin-top:10px;font-size:12px;color:#334155;line-height:1.8">
            <div><b>Receipt No. :</b> ${esc(receipt.receipt_no || '—')}</div>
            <div><b>Date :</b> ${fmtDate(receipt.receipt_date)}</div>
            ${admission.center_name ? `<div><b>Center :</b> ${esc(admission.center_name)}</div>` : ''}
          </div>
        </td>
      </tr>
    </table>
    <div style="height:3px;background:#0f172a;margin:14px 0 18px"></div>`;

  // --- Section heading helper (red tick bar + uppercase label) ---
  const heading = (label) => `
    <div style="display:flex;align-items:center;margin:0 0 10px">
      <span style="display:inline-block;width:4px;height:15px;background:${accent};margin-right:8px"></span>
      <span style="font-size:12px;font-weight:800;letter-spacing:0.5px;color:#0f172a;text-transform:uppercase">${label}</span>
    </div>`;

  // --- Student details (2-col grid) ---
  const kv = (label, value) => `
    <td style="width:50%;vertical-align:top;padding:0 12px 14px 0;word-break:break-word;overflow-wrap:anywhere">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;color:#94a3b8;text-transform:uppercase">${label}</div>
      <div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:2px">${esc(value || '—')}</div>
    </td>`;
  const studentDetails = `
    ${heading('Student Details')}
    <table style="width:100%;border-collapse:collapse;table-layout:fixed">
      <tr>${kv('Name', admission.student_name)}${kv('Contact', admission.contact)}</tr>
      <tr>${kv('Course', admission.program_name)}${kv('Date of Admission', fmtDate(admission.admission_date))}</tr>
      <tr>${kv('Mode of Training', admission.mode_of_training)}<td style="width:50%"></td></tr>
    </table>`;

  // --- Payment summary card (4 across + Paid Till Date below) ---
  const cardCell = (label, value, color) => `
    <td style="vertical-align:top;padding:0 8px 0 0">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;color:#64748b;text-transform:uppercase">${label}</div>
      <div style="font-size:20px;font-weight:800;color:${color || '#0f172a'};margin-top:4px;white-space:nowrap">${value}</div>
    </td>`;
  const paymentSummary = `
    ${heading('Payment Summary')}
    <table style="width:100%;border-collapse:collapse;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px">
      <tr><td style="padding:16px 18px 12px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            ${cardCell('Course Fees', money(totals.total))}
            ${cardCell('Amount Paid Today', money(receipt.amount))}
            ${cardCell('Payment Mode', esc((receipt.mode_of_payment || '—').toUpperCase()))}
            ${cardCell('Remaining Payment', money(totals.due), accent)}
          </tr>
        </table>
        <div style="border-top:1px dashed #cbd5e1;margin:12px 0"></div>
        <table style="width:100%;border-collapse:collapse"><tr>
          ${cardCell('Paid Till Date', money(totals.paid))}
        </tr></table>
      </td></tr>
    </table>`;

  // --- Upcoming installment schedule (unpaid only) ---
  let installments = '';
  if (upcoming && upcoming.length) {
    const rows = upcoming.map((r) => `
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #eef2f7;font-size:13px;font-weight:600;color:#0f172a">${fmtDate(r.due_date)}</td>
        <td style="padding:11px 16px;border-bottom:1px solid #eef2f7;font-size:13px;font-weight:700;color:#0f172a;text-align:right">${money(r.amount)}</td>
      </tr>`).join('');
    installments = `
      <div style="margin-top:18px"></div>
      ${heading('Upcoming Installment Schedule')}
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <tr style="background:#0f172a">
          <td style="padding:11px 16px;font-size:11px;font-weight:700;letter-spacing:0.5px;color:#fff;text-transform:uppercase">Due Date</td>
          <td style="padding:11px 16px;font-size:11px;font-weight:700;letter-spacing:0.5px;color:#fff;text-transform:uppercase;text-align:right">Due Amount</td>
        </tr>
        ${rows}
      </table>`;
  } else {
    installments = `
      <div style="margin-top:18px"></div>
      ${heading('Upcoming Installment Schedule')}
      <div style="padding:14px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#15803d;font-weight:600;background:#f0fdf4">No upcoming installments — fully paid.</div>`;
  }

  // --- Footer: configurable terms + thank-you + system-generated / signatory ---
  const terms = (Array.isArray(tenant.receipt_terms) ? tenant.receipt_terms : [])
    .map((t) => `<div style="font-size:11px;color:#475569;line-height:1.7;word-break:break-word;overflow-wrap:anywhere">${esc(t)}</div>`).join('');
  const signatory = tenant.receipt_signatory_label || 'Authorized Signatory';
  // Thank-you line — admin-configurable; defaults to naming the brand.
  const thankYou = (tenant.receipt_thankyou && String(tenant.receipt_thankyou).trim())
    || `Thank you for choosing ${brandName}.`;
  const footer = `
    ${terms ? `<div style="margin-top:18px;padding:12px 16px;background:#f1f5f9;border-left:4px solid ${accent};border-radius:4px">${terms}</div>` : ''}
    <div style="margin-top:16px;font-size:13px;font-weight:700;color:#0f172a;word-break:break-word;overflow-wrap:anywhere">${esc(thankYou)}</div>
    <table style="width:100%;border-collapse:collapse;margin-top:22px;border-top:1px solid #e2e8f0">
      <tr>
        <td style="padding-top:10px;font-size:11px;color:#94a3b8;vertical-align:bottom">This is a system-generated receipt.</td>
        <td style="padding-top:10px;font-size:11px;color:#64748b;text-align:right;vertical-align:bottom">${esc(signatory)}</td>
      </tr>
    </table>`;

  // Payment proof (optional; shown on-screen/PDF when accounts attached one).
  const proof = receipt.payment_screenshot_url ? `
    <div style="margin-top:16px"></div>
    ${heading('Payment Proof')}
    <img src="${esc(receipt.payment_screenshot_url)}" alt="Payment proof" crossorigin="anonymous"
         style="max-width:260px;max-height:200px;object-fit:contain;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc" />` : '';

  return `
    <div style="box-sizing:border-box;width:100%;max-width:760px;margin:0 auto;background:#fff;color:#0f172a;
                font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;padding:32px 34px">
      ${header}
      ${studentDetails}
      <div style="margin-top:6px"></div>
      ${paymentSummary}
      ${installments}
      ${proof}
      ${footer}
    </div>`;
}

export default buildReceiptHtml;
