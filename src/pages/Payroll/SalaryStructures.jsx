// Salary Structures — the editable fixed + variable pay per employee.
//
// A structure is never edited in place: saving closes the current version and
// opens a new one from the effective date, so a payslip issued last month still
// explains itself. That is why the form asks for an effective date rather than
// just overwriting.
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { payrollApi, usersApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton, Btn, Field, input, Section } from '../../lib/lmsUi';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const d = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');

export default function SalaryStructures() {
  const [rows, setRows] = useState([]);
  const [components, setComponents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [edit, setEdit] = useState(null);      // { user_id, effective_from, lines: {code: {...}} }

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      payrollApi.structures().catch((e) => { setToast({ severity: 'error', text: e.message }); return { data: [] }; }),
      payrollApi.components().catch(() => ({ data: [] })),
      // options() over list(): no 50-row page cap, and it needs no role gate.
      usersApi.options().catch(() => ({ data: [] })),
    ]).then(([s, c, u]) => {
      setRows(s?.data || []);
      setComponents(c?.data || []);
      setStaff((u?.data || []).filter((x) => x.role !== 'student'));
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Only the CURRENT version per employee — superseded rows are history.
  const current = useMemo(
    () => rows.filter((r) => !r.effective_to),
    [rows],
  );

  const openFor = async (userId) => {
    const existing = await payrollApi.structure(userId).catch(() => null);
    const lines = {};
    for (const c of existing?.data?.components || []) {
      lines[c.component_id] = {
        amount: c.amount ?? '', percent: c.percent ?? '', rate: c.rate ?? '',
        default_units: c.default_units ?? 0,
      };
    }
    setEdit({
      user_id: userId,
      effective_from: new Date().toISOString().slice(0, 8) + '01',
      annual_ctc: existing?.data?.annual_ctc ?? '',
      lines,
    });
  };

  const setLine = (compId, field, value) => setEdit((e) => ({
    ...e,
    lines: { ...e.lines, [compId]: { ...(e.lines[compId] || {}), [field]: value } },
  }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: edit.user_id,
        effective_from: edit.effective_from,
        annual_ctc: Number(edit.annual_ctc) || 0,
        components: Object.entries(edit.lines)
          // A line with nothing filled in is simply not part of the structure.
          .filter(([, v]) => v.amount !== '' || v.percent !== '' || v.rate !== '')
          .map(([component_id, v]) => ({
            component_id,
            amount: v.amount === '' ? null : Number(v.amount),
            percent: v.percent === '' ? null : Number(v.percent),
            rate: v.rate === '' ? null : Number(v.rate),
            default_units: Number(v.default_units) || 0,
          })),
      };
      await payrollApi.saveStructure(payload);
      setEdit(null);
      setToast({ severity: 'success', text: 'Salary structure saved as a new version' });
      load();
    } catch (e) { setToast({ severity: 'error', text: e.message }); }
    finally { setSaving(false); }
  };

  // What each component needs from the user, by calc_type.
  const fieldFor = (c) => {
    if (c.calc_type === 'percent_of_basic' || c.calc_type === 'percent_of_gross') return 'percent';
    if (c.calc_type === 'per_unit' || c.calc_type === 'incentive_slab') return 'rate';
    return 'amount';
  };
  const hintFor = (c) => ({
    percent_of_basic: '% of basic',
    percent_of_gross: '% of gross',
    per_unit: `₹ per ${c.unit_label || 'unit'}`,
    incentive_slab: `₹ per ${c.unit_label || 'unit'} (slabs can override)`,
  }[c.calc_type] || '₹ per month');

  const editingUser = staff.find((s) => s.id === edit?.user_id);
  const earnings = components.filter((c) => c.kind === 'earning');
  const deductions = components.filter((c) => c.kind !== 'earning');

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <PageHeader
        title="Salary Structures"
        subtitle="Fixed pay plus the variable heads — extra classes, demos, incentives."
        icon={AccountBalanceWalletIcon}
      />

      {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : (
          <>
            <Section title="Who has a structure" right={(
              <Select size="small" displayEmpty value="" onChange={(e) => openFor(e.target.value)} sx={{ minWidth: 220 }}>
                <MenuItem value="" disabled>Set a structure for…</MenuItem>
                {staff.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} · {s.role}</MenuItem>)}
              </Select>
            )}>
              {current.length === 0 ? (
                <Card><EmptyState icon="📄" title="No salary structures yet"
                  text="Payroll can only compute for employees who have one. Pick somebody above to start." /></Card>
              ) : (
                <Card pad={0}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead><tr style={{ background: '#fafbfc', textAlign: 'left' }}>
                        <th style={{ padding: 10 }}>Employee</th><th style={{ padding: 10 }}>Role</th>
                        <th style={{ padding: 10 }}>Monthly gross</th><th style={{ padding: 10 }}>Annual CTC</th>
                        <th style={{ padding: 10 }}>Effective from</th><th style={{ padding: 10 }} />
                      </tr></thead>
                      <tbody>
                        {current.map((r) => (
                          <tr key={r.id} style={{ borderTop: '1px solid #eef2f7' }}>
                            <td style={{ padding: 10 }}>{r.user_name}</td>
                            <td style={{ padding: 10, color: '#64748b' }}>{r.user_role}</td>
                            <td style={{ padding: 10 }}>{inr(r.monthly_gross)}</td>
                            <td style={{ padding: 10 }}>{inr(r.annual_ctc)}</td>
                            <td style={{ padding: 10 }}>{d(r.effective_from)}</td>
                            <td style={{ padding: 10, textAlign: 'right' }}>
                              <Btn size="sm" variant="ghost" onClick={() => openFor(r.user_id)}>Edit</Btn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </Section>
          </>
        )}

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="md">
        <DialogTitle>
          Salary structure{editingUser ? ` — ${editingUser.name}` : ''}
          {editingUser && <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14 }}> · {editingUser.role}</span>}
        </DialogTitle>
        <DialogContent>
          {edit && (
            <>
              <div style={{ display: 'flex', gap: 12 }}>
                <Field label="Effective from" hint="A new version starts on this date" full>
                  <input type="date" style={input} value={edit.effective_from}
                    onChange={(e) => setEdit((x) => ({ ...x, effective_from: e.target.value }))} />
                </Field>
                <Field label="Annual CTC" full>
                  <TextField size="small" fullWidth type="number" value={edit.annual_ctc}
                    onChange={(e) => setEdit((x) => ({ ...x, annual_ctc: e.target.value }))} />
                </Field>
              </div>

              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', margin: '14px 0 6px' }}>EARNINGS</div>
              {earnings.map((c) => {
                const f = fieldFor(c);
                const applies = !c.applies_to?.length || !editingUser || c.applies_to.includes(editingUser.role);
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderTop: '1px solid #f1f5f9', opacity: applies ? 1 : 0.55 }}>
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div style={{ fontSize: 14 }}>{c.name}
                        {!applies && <span style={{ color: '#94a3b8', fontSize: 12 }}> · not typical for this role</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{hintFor(c)}</div>
                    </div>
                    <TextField size="small" type="number" placeholder="—" sx={{ width: 130 }}
                      value={edit.lines[c.id]?.[f] ?? ''}
                      onChange={(e) => setLine(c.id, f, e.target.value)} />
                  </div>
                );
              })}

              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', margin: '14px 0 6px' }}>DEDUCTIONS</div>
              {deductions.map((c) => {
                const f = fieldFor(c);
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div style={{ fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{hintFor(c)}</div>
                    </div>
                    <TextField size="small" type="number" placeholder="—" sx={{ width: 130 }}
                      value={edit.lines[c.id]?.[f] ?? ''}
                      onChange={(e) => setLine(c.id, f, e.target.value)} />
                  </div>
                );
              })}

              <div style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>
                Variable heads pay on what actually happened — completed classes, closed admissions —
                not on a number typed here. The rate is what each one is worth.
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Btn variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn>
          <Btn disabled={saving || !edit?.effective_from} onClick={save}>{saving ? 'Saving…' : 'Save as new version'}</Btn>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity || 'info'} onClose={() => setToast(null)}>{toast?.text}</Alert>
      </Snackbar>
    </Box>
  );
}
