// Raise-a-ticket modal. Auto-fills the raiser's email/phone from the
// logged-in user, and offers an "Assign to" picker scoped to the raiser's
// reporting chain (counsellor → managers + admins; manager → team + own
// managers + admins; super_admin → everyone in tenant). The form name field
// was removed — the raiser is always the logged-in user.
import { useEffect, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Autocomplete, MenuItem, TextField } from '@mui/material';
import { colors } from '../../theme/colors';
import { ticketsApi } from '../../lib/endpoints';
import { isRole, ROLES } from '../../lib/rbac';
import './RaiseTicketModal.css';

const blankForm = {
  email: '',
  phone: '',
  subject: '',
  category: '',
  priority: 'normal',
  description: '',
  target_user_id: '',
};

function RaiseTicketModal({ open, onClose, onSubmitted }) {
  // super_admins auto-escalate to the Product Owner; the in-tenant picker
  // is hidden for them so the form doesn't suggest an alternate target.
  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN);
  const [form, setForm] = useState(blankForm);
  const [contacts, setContacts] = useState([]);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    // Pull caller info to auto-fill email/phone. Skip the contacts fetch
    // for super_admins since the picker is hidden for them.
    const tasks = [ticketsApi.me().catch(() => null)];
    if (!isSuperAdmin) tasks.push(ticketsApi.contacts().catch(() => null));
    Promise.all(tasks).then(([me, ct]) => {
      setForm((prev) => ({
        ...prev,
        email: me?.data?.email ?? '',
        phone: me?.data?.phone ?? '',
      }));
      setContacts(ct?.data ?? []);
    });
  }, [open, isSuperAdmin]);

  if (!open) return null;

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e?.target ? e.target.value : e }));

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected].slice(0, 5));
  };

  const handleRemoveFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) { setError('Subject is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await ticketsApi.create({
        subject: form.subject.trim(),
        category: form.category || undefined,
        priority: form.priority,
        description: form.description || undefined,
        phone: form.phone || undefined,
        target_user_id: form.target_user_id || undefined,
      });
      onSubmitted?.();
      setForm(blankForm);
      setFiles([]);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const targetValue = contacts.find((c) => c.id === form.target_user_id) || null;

  return (
    <div className="ticket-overlay" onClick={onClose}>
      <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ticket-header" style={{ backgroundColor: colors.primary }}>
          <h2 className="ticket-header-title">Raise a Ticket</h2>
          <button className="ticket-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="ticket-body">
          <form onSubmit={submit}>
            <div className="ticket-field">
              <label>Email <span className="required">*</span></label>
              <input type="email" name="email" value={form.email} onChange={setField('email')} required readOnly />
            </div>

            <div className="ticket-field">
              <label>Phone</label>
              <input type="tel" name="phone" value={form.phone} onChange={setField('phone')} placeholder="Auto-filled from your profile" />
            </div>

            {isSuperAdmin ? (
              <div className="ticket-field" style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: 10, fontSize: 13 }}>
                This ticket will be auto-escalated to the Product Owner.
              </div>
            ) : (
              <div className="ticket-field">
                <label>Assign to (your reporting chain)</label>
                <Autocomplete
                  size="small"
                  options={contacts}
                  getOptionLabel={(o) => (o ? `${o.name || o.email} · ${String(o.role || '').replace('_', ' ')}` : '')}
                  value={targetValue}
                  onChange={(_e, picked) => setField('target_user_id')(picked?.id || '')}
                  isOptionEqualToValue={(a, b) => a?.id === b?.id}
                  noOptionsText="No contacts available — escalation will fall back to defaults"
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Type to search…" />
                  )}
                />
              </div>
            )}

            <div className="ticket-field">
              <label>Subject <span className="required">*</span></label>
              <input type="text" name="subject" value={form.subject} onChange={setField('subject')} required />
            </div>

            <div className="ticket-field">
              <label>Priority</label>
              <TextField select size="small" value={form.priority} onChange={setField('priority')} fullWidth>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            </div>

            <div className="ticket-field">
              <label>Category</label>
              <input type="text" name="category" value={form.category} onChange={setField('category')} placeholder="e.g. Bug, Feature, Access" />
            </div>

            <div className="ticket-field">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={setField('description')} rows={5} />
            </div>

            <div
              className="ticket-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUploadIcon style={{ fontSize: 40, color: colors.midGrey }} />
              <p className="upload-title">Upload files (max 5)</p>
              <p className="upload-subtitle">Click to add files. Attachment upload wiring lands in Stage 2.</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </div>

            {files.length > 0 && (
              <div className="ticket-file-list">
                {files.map((file, i) => (
                  <div key={i} className="ticket-file-item">
                    <span>{file.name}</span>
                    <button type="button" onClick={() => handleRemoveFile(i)}>
                      <CloseIcon style={{ fontSize: 14 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <div style={{ color: '#d32f2f', fontSize: 13, margin: '8px 0' }}>{error}</div>}

            <button
              type="submit"
              className="ticket-submit-btn"
              style={{ backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RaiseTicketModal;
