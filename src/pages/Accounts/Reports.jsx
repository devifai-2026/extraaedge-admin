import React, { useState } from 'react';
import {
  TextField, MenuItem, Select, FormControl, InputLabel, Button,
  CircularProgress, Chip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useDropdown } from '../../lib/useDropdowns';
import { admissionsApi } from '../../lib/endpoints';
import { fullName, fmtDate, fmtMoney, downloadCsv } from './utils';
import StatusPill from './StatusPill';
import './Accounts.css';

// Shared filter bar for all three report pages. Date range + optional
// course; the parent owns the loading + result state.
const ReportFilters = ({ values, onChange, onRun, loading }) => {
  const programs = useDropdown('programs', { enabled: true });
  return (
    <div className="accounts-filter-bar">
      <div className="accounts-filter-field">
        <span className="accounts-filter-label">From Date</span>
        <TextField type="date" size="small" value={values.date_from} onChange={(e) => onChange({ ...values, date_from: e.target.value })} />
      </div>
      <div className="accounts-filter-field">
        <span className="accounts-filter-label">To Date</span>
        <TextField type="date" size="small" value={values.date_to} onChange={(e) => onChange({ ...values, date_to: e.target.value })} />
      </div>
      <div className="accounts-filter-field accounts-filter-field-wide">
        <span className="accounts-filter-label">Course</span>
        <FormControl size="small" fullWidth>
          <Select value={values.program_id || ''} onChange={(e) => onChange({ ...values, program_id: e.target.value || '' })} displayEmpty>
            <MenuItem value=""><em>All courses</em></MenuItem>
            {(programs.data || []).filter((p) => p.is_active !== false).map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      <div className="accounts-filter-field">
        <span className="accounts-filter-label">&nbsp;</span>
        <Button
          variant="contained"
          onClick={onRun}
          disabled={loading}
          sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
        >
          {loading ? 'Loading…' : 'Check'}
        </Button>
      </div>
    </div>
  );
};

const TotalsStrip = ({ items }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
    {items.map((it) => (
      <Chip
        key={it.label}
        label={(
          <span>
            <strong>{it.label}:</strong>{' '}
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{it.value}</span>
          </span>
        )}
        sx={{
          background: it.color || '#eef2ff',
          color: it.fg || '#1e293b',
          fontWeight: 500,
          height: 28,
        }}
      />
    ))}
  </div>
);

// ============================================================================
// PAY SCHEDULE REPORT
// ============================================================================
export const PaySchedulePage = () => {
  const [filters, setFilters] = useState({ date_from: '', date_to: '', program_id: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const r = await admissionsApi.paySchedule(filters);
      setResult(r?.data || { rows: [], totals: {} });
    } finally { setLoading(false); }
  };

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">Pay Schedule Report</div>
          <div className="accounts-page-subtitle">
            Outstanding fees, paid till date, and dues falling in the current month.
          </div>
        </div>
      </div>

      <ReportFilters values={filters} onChange={setFilters} onRun={run} loading={loading} />

      {result && (
        <>
          <TotalsStrip
            items={[
              { label: 'Due This Month',      value: fmtMoney(result.totals?.due_this_month),     color: '#fef3c7', fg: '#92400e' },
              { label: 'Collection Received', value: fmtMoney(result.totals?.collection_received), color: '#dcfce7', fg: '#166534' },
              { label: 'Old',                 value: fmtMoney(result.totals?.old),                color: '#e0e7ff', fg: '#3730a3' },
              { label: 'New',                 value: fmtMoney(result.totals?.new),                color: '#cffafe', fg: '#155e75' },
            ]}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => downloadCsv('pay-schedule.csv', [
                { key: 'name', label: 'Name', value: (r) => fullName(r) },
                { key: 'course', label: 'Course' },
                { key: 'admission_date', label: 'Admission Date', value: (r) => fmtDate(r.admission_date) },
                { key: 'status', label: 'Status' },
                { key: 'total_fees', label: 'Fees' },
                { key: 'paid_till_date', label: 'Paid Till Date' },
                { key: 'pending_fees', label: 'Pending Fees' },
                { key: 'due_this_month', label: 'Due This Month' },
                { key: 'next_due_date', label: 'Due Date', value: (r) => fmtDate(r.next_due_date) },
                { key: 'whatsapp_number', label: 'Contact' },
              ], result.rows || [])}
              sx={{ textTransform: 'none' }}
            >
              Export CSV
            </Button>
          </div>
          <div className="accounts-table-card">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Course</th>
                  <th>Admission Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Fees</th>
                  <th style={{ textAlign: 'right' }}>Paid Till Date</th>
                  <th style={{ textAlign: 'right' }}>Pending Fees</th>
                  <th style={{ textAlign: 'right' }}>Due This Month</th>
                  <th>Due Date</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {(result.rows || []).map((r) => (
                  <tr key={r.id}>
                    <td>{fullName(r)}</td>
                    <td>{r.course || '—'}</td>
                    <td>{fmtDate(r.admission_date)}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(r.total_fees)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(r.paid_till_date)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(r.pending_fees)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(r.due_this_month)}</td>
                    <td>{fmtDate(r.next_due_date)}</td>
                    <td style={{ fontSize: 12 }}>{[r.whatsapp_number, r.alternate_contact].filter(Boolean).join(' / ')}</td>
                  </tr>
                ))}
                {(!result.rows || result.rows.length === 0) && (
                  <tr><td colSpan={10} className="accounts-empty">No data available in table</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {loading && !result && <div className="accounts-empty"><CircularProgress size={20} /></div>}
    </div>
  );
};

// ============================================================================
// COLLECTION RECEIPT-WISE REPORT
// ============================================================================
export const CollectionReceiptWisePage = () => {
  const [filters, setFilters] = useState({ date_from: '', date_to: '', program_id: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const r = await admissionsApi.collectionReceiptWise(filters);
      setResult(r?.data || { rows: [], totals: {} });
    } finally { setLoading(false); }
  };

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">Collection Receipt Wise</div>
          <div className="accounts-page-subtitle">
            Per-receipt collection log, filterable by date and course.
          </div>
        </div>
      </div>

      <ReportFilters values={filters} onChange={setFilters} onRun={run} loading={loading} />

      {result && (
        <>
          <TotalsStrip
            items={[
              { label: 'Total Collection', value: fmtMoney(result.totals?.total), color: '#dcfce7', fg: '#166534' },
              { label: 'Old Collection',   value: fmtMoney(result.totals?.old),   color: '#e0e7ff', fg: '#3730a3' },
              { label: 'New Collection',   value: fmtMoney(result.totals?.new),   color: '#cffafe', fg: '#155e75' },
            ]}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => downloadCsv('collection-receipt-wise.csv', [
                { key: 'receipt_no', label: 'Receipt No.' },
                { key: 'receipt_date', label: 'Date', value: (r) => fmtDate(r.receipt_date) },
                { key: 'name', label: 'Name', value: (r) => fullName(r) },
                { key: 'course', label: 'Course' },
                { key: 'amount', label: 'Amount Received' },
                { key: 'mode_of_payment', label: 'Mode Of Payment' },
                { key: 'transaction_details', label: 'Transaction Details' },
              ], result.rows || [])}
              sx={{ textTransform: 'none' }}
            >
              Export CSV
            </Button>
          </div>
          <div className="accounts-table-card">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Receipt No.</th>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Course</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Mode</th>
                  <th>Transaction Details</th>
                </tr>
              </thead>
              <tbody>
                {(result.rows || []).map((r) => (
                  <tr key={r.id}>
                    <td>{r.receipt_no}</td>
                    <td>{fmtDate(r.receipt_date)}</td>
                    <td>{fullName(r)}</td>
                    <td>{r.course || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(r.amount)}</td>
                    <td>{r.mode_of_payment}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{r.transaction_details || '—'}</td>
                  </tr>
                ))}
                {(!result.rows || result.rows.length === 0) && (
                  <tr><td colSpan={7} className="accounts-empty">No data available in table</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {loading && !result && <div className="accounts-empty"><CircularProgress size={20} /></div>}
    </div>
  );
};

// ============================================================================
// ADMISSIONS REPORT (date-range list of admissions with CSV export)
// ============================================================================
export const AdmissionsReportPage = () => {
  const [filters, setFilters] = useState({ date_from: '', date_to: '', program_id: '' });
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const r = await admissionsApi.list({ ...filters, limit: 200 });
      setRows(r?.data || []);
    } finally { setLoading(false); }
  };

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">Admissions Report</div>
          <div className="accounts-page-subtitle">
            Date-range list of admissions. Filter by course; download as CSV.
          </div>
        </div>
      </div>

      <ReportFilters values={filters} onChange={setFilters} onRun={run} loading={loading} />

      {rows && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => downloadCsv('admissions.csv', [
                { key: 'admission_date', label: 'Admission Date', value: (r) => fmtDate(r.admission_date) },
                { key: 'name', label: 'Name', value: (r) => fullName(r) },
                { key: 'whatsapp_number', label: 'Contact' },
                { key: 'email', label: 'Email' },
                { key: 'program_name', label: 'Course' },
                { key: 'mode_of_training', label: 'Mode of Training' },
                { key: 'status', label: 'Status' },
                { key: 'total_fees', label: 'Fees' },
              ], rows)}
              sx={{ textTransform: 'none' }}
            >
              Export CSV
            </Button>
          </div>
          <div className="accounts-table-card">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Admission Date</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Course</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Fees</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="accounts-empty">No admissions in this window.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.admission_date)}</td>
                    <td>{fullName(r)}</td>
                    <td>{r.whatsapp_number}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{r.email || '—'}</td>
                    <td>{r.program_name || '—'}</td>
                    <td>{r.mode_of_training}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(r.total_fees)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {loading && !rows && <div className="accounts-empty"><CircularProgress size={20} /></div>}
    </div>
  );
};
