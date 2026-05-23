// Configure-fee-offer modal for the accounts team.
//
// Opened from a "Configure offer" / "Reconfigure" button on the Pending
// Admissions row. Lets the accounts user:
//   1. Pick a course (defaults to the lead's program_id).
//   2. Tweak course fees + registration amount + registration date.
//   3. Pick payment mode (Full / Installment).
//   4. If Installment: up to 4 installments, each with amount + due_date.
//      Math rule (BE-enforced too): registration + Σ installments must
//      equal course fees exactly (epsilon 0.01).
//
// Saves to PUT /lead-fee-offers/:leadId. Until a row exists the public
// share-link generator refuses to mint a token — so this modal IS the
// gate to "Copy link" + "Start admission form" buttons.
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  TextField, MenuItem, Button, Alert, CircularProgress, Box, Typography, Divider, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { leadFeeOffersApi } from '../../lib/endpoints';

// HTML date inputs expect YYYY-MM-DD. Convert any incoming value (Date
// object, ISO string, or already-YYYY-MM-DD) to that format. Returns ''
// for null/undefined so the input renders empty.
const toYmd = (v) => {
  if (!v) return '';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch { return ''; }
};

// Today in the user's LOCAL timezone as YYYY-MM-DD. Using toISOString()
// would shift "today" to yesterday for users west of UTC (or to tomorrow
// for IST after ~05:30 AM) — both wrong for a Date-of-Registration default
// that should match the calendar date the admin sees on their machine.
const todayYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const blankInstallments = () => [1, 2, 3, 4].map((n) => ({
  installment_no: n, amount: '', due_date: '',
}));

// Whitelist must mirror the BE enum on lead_fee_offers.mode_of_training
// (Online / Offline / Hybrid). Kept in sync by hand — short list.
const TRAINING_MODES = ['Online', 'Offline', 'Hybrid'];

const defaultsFromProgram = (p) => {
  if (!p) return null;
  const installments = Array.isArray(p.fee_installments)
    ? p.fee_installments.map((r) => ({
        installment_no: Number(r.installment_no),
        amount: r.amount != null ? String(r.amount) : '',
        // Programs don't carry per-installment due_dates — accounts team
        // sets them per lead. Always start blank.
        due_date: '',
      }))
    : [];
  // Pad to 4 slots so the table renders consistently.
  const padded = [1, 2, 3, 4].map((n) => {
    const found = installments.find((r) => r.installment_no === n);
    return found || { installment_no: n, amount: '', due_date: '' };
  });
  return {
    course_fees: p.course_fees != null ? String(p.course_fees) : '',
    registration_amount: p.registration_amount != null ? String(p.registration_amount) : '',
    payment_mode: p.payment_mode || 'installment',
    fee_installments: padded,
  };
};

export default function ConfigureFeeOffer({ open, leadId, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState(null);
  // Tracks whether an offer existed when we opened — affects the title +
  // primary button label only.
  const [hadOffer, setHadOffer] = useState(false);

  useEffect(() => {
    if (!open || !leadId) return undefined;
    let alive = true;
    setLoading(true); setError('');
    leadFeeOffersApi.get(leadId)
      .then((r) => {
        if (!alive) return;
        const data = r?.data || {};
        const progs = data.programs || [];
        setPrograms(progs);
        // Seed the form. Priority:
        //   1. Existing offer row.
        //   2. Lead's program defaults.
        //   3. Empty form.
        if (data.offer) {
          setHadOffer(true);
          const installments = Array.isArray(data.offer.fee_installments) ? data.offer.fee_installments : [];
          setForm({
            program_id: data.offer.program_id || data.lead?.program_id || '',
            course_fees: data.offer.course_fees != null ? String(data.offer.course_fees) : '',
            registration_amount: data.offer.registration_amount != null ? String(data.offer.registration_amount) : '',
            registration_date: toYmd(data.offer.registration_date),
            mode_of_training: data.offer.mode_of_training || '',
            payment_mode: data.offer.payment_mode || 'installment',
            fee_installments: [1, 2, 3, 4].map((n) => {
              const r2 = installments.find((x) => Number(x.installment_no) === n);
              return {
                installment_no: n,
                amount: r2?.amount != null ? String(r2.amount) : '',
                due_date: toYmd(r2?.due_date),
              };
            }),
          });
        } else {
          setHadOffer(false);
          const seedProgramId = data.lead?.program_id || '';
          const seedProgram = progs.find((p) => p.id === seedProgramId);
          const fromProgram = defaultsFromProgram(seedProgram);
          setForm({
            program_id: seedProgramId,
            course_fees: fromProgram?.course_fees || '',
            registration_amount: fromProgram?.registration_amount || '',
            // Default Date of Registration to today (local time). Admins
            // almost always configure the offer on the same day the lead
            // registers, so save them a click. They can still change it.
            registration_date: todayYmd(),
            mode_of_training: '',
            payment_mode: fromProgram?.payment_mode || 'installment',
            fee_installments: fromProgram?.fee_installments || blankInstallments(),
          });
        }
      })
      .catch((e) => { if (alive) setError(e?.message || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, leadId]);

  // Swapping the course pre-fills empty fields from the new course's
  // defaults but never overwrites anything the admin has already typed.
  // Reasoning: managers often pick the course after they've already
  // entered the numbers they got from the student, and the old
  // "reset-on-swap" behaviour was wiping that work.
  const onChangeProgram = (newProgramId) => {
    const p = programs.find((x) => x.id === newProgramId);
    const d = defaultsFromProgram(p);
    setForm((f) => {
      // An installment row counts as "touched" if either amount or
      // due_date has a value. If none of the four rows are touched we
      // fall back to the new course's defaults; otherwise we keep
      // what's there.
      const anyInstallmentTouched = (f.fee_installments || []).some(
        (r) => (r.amount !== '' && r.amount != null) || (r.due_date !== '' && r.due_date != null),
      );
      return {
        ...f,
        program_id: newProgramId,
        course_fees: f.course_fees !== '' && f.course_fees != null ? f.course_fees : (d?.course_fees || ''),
        registration_amount: f.registration_amount !== '' && f.registration_amount != null ? f.registration_amount : (d?.registration_amount || ''),
        registration_date: f.registration_date || todayYmd(),
        mode_of_training: f.mode_of_training || '',
        // Payment mode is treated as "user has chosen" once they've
        // touched any value in the form — preserve it across swaps so
        // we don't bounce them between Full / Installment.
        payment_mode: f.payment_mode || d?.payment_mode || 'installment',
        fee_installments: anyInstallmentTouched
          ? f.fee_installments
          : (d?.fee_installments || blankInstallments()),
      };
    });
  };

  // Live tally for the math indicator at the bottom.
  const cf = Number(form?.course_fees || 0);
  const reg = Number(form?.registration_amount || 0);
  const installSum = useMemo(() => (
    (form?.fee_installments || []).reduce((a, r) => a + Number(r.amount || 0), 0)
  ), [form?.fee_installments]);
  const total = reg + installSum;
  const delta = cf - total;
  const sumOk = Math.abs(delta) < 0.01;
  const isInstallment = form?.payment_mode === 'installment';

  const distributeEvenly = () => {
    if (!cf) return;
    const remaining = Math.max(0, cf - reg);
    const per = Math.round((remaining / 4) * 100) / 100;
    const residual = Math.round((remaining - per * 4) * 100) / 100;
    setForm((f) => ({
      ...f,
      fee_installments: f.fee_installments.map((r, i) => ({
        ...r,
        amount: String(i === 0 ? (per + residual).toFixed(2) : per.toFixed(2)),
      })),
    }));
  };

  const setKey = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setMode = (e) => {
    const next = e.target.value;
    // Don't wipe the installments grid when flipping to Full — the user
    // might be exploring options and going back to Installment shouldn't
    // make them retype everything. The save handler already drops them
    // server-side when payment_mode='full', so keeping them in local
    // state is purely an undo-friendly UX choice.
    setForm((f) => ({ ...f, payment_mode: next }));
  };
  const setInst = (idx, key) => (e) => {
    const v = e.target.value;
    setForm((f) => ({
      ...f,
      fee_installments: f.fee_installments.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, [key]: v };
        // Clearing the amount also clears any stale due_date so we don't
        // post an orphan date the admin can't see (the date input below
        // is disabled when amount is empty). Mirrors the BE rule: a row
        // has no meaning without an amount.
        if (key === 'amount' && (v === '' || Number(v) === 0)) next.due_date = '';
        return next;
      }),
    }));
  };

  const save = async () => {
    setError('');
    if (!form.program_id) { setError('Pick a course first.'); return; }
    if (!form.course_fees) { setError('Course Fees is required.'); return; }
    if (isInstallment) {
      const slots = form.fee_installments
        .filter((r) => Number(r.amount || 0) > 0);
      if (!slots.length) { setError('Add at least one installment.'); return; }
      if (slots.some((r) => !r.due_date)) {
        setError('Set a due date for every installment with an amount.');
        return;
      }
      if (!sumOk) {
        setError(`Registration + installments (${total.toFixed(2)}) must equal course fees (${cf.toFixed(2)}).`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        program_id: form.program_id,
        course_fees: Number(form.course_fees),
        registration_amount: Number(form.registration_amount || 0),
        registration_date: form.registration_date || null,
        mode_of_training: form.mode_of_training || null,
        payment_mode: form.payment_mode,
        fee_installments: isInstallment
          ? form.fee_installments
              .filter((r) => Number(r.amount || 0) > 0)
              .map((r) => ({
                installment_no: Number(r.installment_no),
                amount: Number(r.amount),
                due_date: r.due_date,
              }))
          : null,
      };
      await leadFeeOffersApi.upsert(leadId, payload);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {hadOffer ? 'Reconfigure Fee Offer' : 'Configure Fee Offer'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Customise the fees for this lead. Saves to a per-lead row; the program defaults stay untouched.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent>
        {loading || !form ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Course + base figures. Four fields on one row at md+;
                wraps to 2x2 on smaller widths automatically. */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
              <TextField
                size="small" select label="Course *" value={form.program_id}
                onChange={(e) => onChangeProgram(e.target.value)}
                helperText="Changing the course resets the fee plan to its defaults."
              >
                <MenuItem value=""><em>Select course</em></MenuItem>
                {programs.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                size="small" label="Course Fees *" type="number"
                value={form.course_fees} onChange={setKey('course_fees')}
                inputProps={{ min: 0, step: 'any' }}
              />
              {/* Mode of Training: gets pre-filled and locked on the
                  student's admission form once saved. Optional here so
                  legacy offers don't force the manager to pick on every
                  re-save, but encouraged via the helper text. */}
              <TextField
                size="small" select label="Mode of Training"
                value={form.mode_of_training || ''} onChange={setKey('mode_of_training')}
                helperText="Locked on the student's form."
              >
                <MenuItem value=""><em>Select</em></MenuItem>
                {TRAINING_MODES.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </TextField>
              <TextField
                size="small" select label="Mode of Payment *"
                value={form.payment_mode} onChange={setMode}
              >
                <MenuItem value="full">Full</MenuItem>
                <MenuItem value="installment">Installment</MenuItem>
              </TextField>
            </Box>

            {/* Registration row */}
            <Box sx={{
              border: '1px solid #e5e7eb', borderRadius: 1, p: 2,
              background: '#fafafa',
              display: 'grid', gridTemplateColumns: '160px 1fr 200px 1fr', gap: 2, alignItems: 'center',
            }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Registration Amount
              </Typography>
              <TextField
                size="small" type="number" fullWidth
                value={form.registration_amount} onChange={setKey('registration_amount')}
                inputProps={{ min: 0, step: 'any' }}
              />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Date of Registration
              </Typography>
              <TextField
                size="small" type="date" fullWidth
                value={form.registration_date} onChange={setKey('registration_date')}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            {/* Installments — only when payment_mode='installment' */}
            {isInstallment && (
              <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  px: 2, py: 1, background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
                }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Fees Payment Breakup
                  </Typography>
                  <Tooltip title="Distribute (course fees − registration) evenly across 4 slots">
                    <span>
                      <Button
                        size="small"
                        startIcon={<AutoFixHighIcon fontSize="small" />}
                        onClick={distributeEvenly}
                        disabled={!cf}
                        sx={{ textTransform: 'none', color: '#E53935' }}
                      >
                        Distribute evenly
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <Box component="table" sx={{
                    width: '100%', borderCollapse: 'separate', borderSpacing: 0,
                    fontSize: 13,
                    '& th': { textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e5e7eb' },
                    '& td': { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
                    '& tr:last-of-type td': { borderBottom: 'none' },
                  }}>
                    <thead>
                      <tr>
                        <th style={{ width: 130 }} />
                        {['1st Installment', '2nd Installment', '3rd Installment', '4th Installment'].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600, color: '#374151' }}>Fees Payment Breakup</td>
                        {form.fee_installments.map((r, idx) => (
                          <td key={`amt-${r.installment_no}`}>
                            <TextField
                              size="small" type="number" fullWidth placeholder="Amount"
                              value={r.amount} onChange={setInst(idx, 'amount')}
                              inputProps={{ min: 0, step: 'any' }}
                            />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600, color: '#374151' }}>Date of Installments</td>
                        {form.fee_installments.map((r, idx) => {
                          // Date is gated on amount: no amount = no due
                          // date. Mirrors the validation in save() which
                          // only requires due_date when amount > 0.
                          const hasAmount = r.amount !== '' && Number(r.amount) > 0;
                          return (
                            <td key={`date-${r.installment_no}`}>
                              <TextField
                                size="small" type="date" fullWidth
                                value={r.due_date} onChange={setInst(idx, 'due_date')}
                                disabled={!hasAmount}
                                helperText={!hasAmount ? 'Enter amount first' : ''}
                                slotProps={{
                                  inputLabel: { shrink: true },
                                  formHelperText: { sx: { fontSize: 10, ml: 0 } },
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Live math tally */}
            {isInstallment && (
              <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 12, color: '#475569',
              }}>
                <span>
                  Registration + Installments = <strong>{total.toFixed(2)}</strong>
                  {cf > 0 && <> / Course Fees <strong>{cf.toFixed(2)}</strong></>}
                </span>
                {cf > 0 && (
                  <span style={{ color: sumOk ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {sumOk ? '✓ Matches course fees' : delta > 0 ? `Short by ${delta.toFixed(2)}` : `Over by ${Math.abs(delta).toFixed(2)}`}
                  </span>
                )}
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            <Divider />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={saving || loading || !form}
          sx={{ background: '#E53935', '&:hover': { background: '#C62828' } }}
        >
          {saving ? 'Saving…' : (hadOffer ? 'Save changes' : 'Save offer')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
