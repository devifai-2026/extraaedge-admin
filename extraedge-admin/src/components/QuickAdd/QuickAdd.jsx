// Quick Add — lightweight lead capture from the header. Posts to /quick-add
// which skips round-robin auto-assignment so the lead shows up in the
// "Unassigned" bucket on the dashboard / lead-list. Admins / managers then
// assign manually.
import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import { quickAddApi } from '../../lib/endpoints';
import { useDropdown } from '../../lib/useDropdowns';
import './QuickAdd.css';

const initialFormData = {
    applicantName: '',
    whatsappNumber: '',
    alternateContactNumber: '',
    emailId: '',
    program_id: '',
    channel_id: '',
    source_id: '',
    sendWelcomeEmail: false,
    sendWelcomeSMS: false,
};

const QuickAdd = ({ open, onClose, onCreated }) => {
    const [formData, setFormData] = useState(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState(null);

    // Pull dropdowns from API. They cache so re-opening the dialog is instant.
    const programs = useDropdown('programs', { enabled: open });
    const channels = useDropdown('channels', { enabled: open });
    const sources  = useDropdown('sources',  { enabled: open });

    useEffect(() => {
        if (open) { setFormData(initialFormData); setError(''); }
    }, [open]);

    const handleChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };
    const handleCheckbox = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.checked }));
    };
    const handleClearSelect = (field) => () => {
        setFormData((prev) => ({ ...prev, [field]: '' }));
    };

    const buildPayload = () => {
        const p = {};
        if (formData.applicantName.trim()) p.name = formData.applicantName.trim();
        if (formData.whatsappNumber.trim()) {
            p.whatsapp_number = formData.whatsappNumber.trim();
            p.phone = formData.whatsappNumber.trim();
        }
        if (formData.alternateContactNumber.trim()) p.alternate_contact = formData.alternateContactNumber.trim();
        if (formData.emailId.trim()) p.email = formData.emailId.trim();
        if (formData.program_id) p.program_id = formData.program_id;
        // Source attribution row — single primary
        const src = {};
        if (formData.channel_id) src.channel_id = formData.channel_id;
        if (formData.source_id)  src.source_id  = formData.source_id;
        if (Object.keys(src).length) p.sources = [{ ...src, is_primary: true }];
        return p;
    };

    const validate = () => {
        if (!formData.applicantName.trim()) return 'Applicant Name is required';
        if (!formData.whatsappNumber.trim()) return 'WhatsApp Number is required';
        if (!formData.program_id) return 'Program is required';
        if (!formData.channel_id) return 'Channel is required';
        if (!formData.source_id)  return 'Source is required';
        return null;
    };

    const submit = async () => {
        const err = validate();
        if (err) { setError(err); return; }
        setSubmitting(true);
        setError('');
        try {
            await quickAddApi.create(buildPayload());
            return true;
        } catch (e) {
            setError(e.message || 'Failed to add lead');
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveAndClose = async () => {
        const ok = await submit();
        if (ok) {
            setFormData(initialFormData);
            setToast({ severity: 'success', text: 'Lead saved to Unassigned bucket.' });
            onCreated?.();
            onClose?.();
        }
    };

    const handleSaveAndAddMore = async () => {
        const ok = await submit();
        if (ok) {
            setFormData(initialFormData);
            setToast({ severity: 'success', text: 'Lead saved. Add another.' });
            onCreated?.();
        }
    };

    const resetAndClose = () => {
        setFormData(initialFormData);
        setError('');
        onClose?.();
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={resetAndClose}
                maxWidth={false}
                PaperProps={{ className: 'quick-add-modal' }}
            >
                <DialogTitle className="quick-add-header" sx={{ padding: 0 }}>
                    <h2>Quick Add</h2>
                    <IconButton onClick={resetAndClose} size="small" sx={{ color: '#999' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent className="quick-add-body" sx={{ padding: 0 }}>
                    <div className="quick-add-form-grid">
                        <div className="quick-add-field">
                            <label>Applicant Name<span className="required">*</span></label>
                            <input
                                type="text"
                                placeholder="Applicant Name"
                                value={formData.applicantName}
                                onChange={handleChange('applicantName')}
                            />
                        </div>

                        <div className="quick-add-field">
                            <label>WhatsApp Number<span className="required">*</span></label>
                            <input
                                type="text"
                                placeholder="WhatsApp Number"
                                value={formData.whatsappNumber}
                                onChange={handleChange('whatsappNumber')}
                            />
                        </div>

                        <div className="quick-add-field">
                            <label>Alternate Contact Number</label>
                            <input
                                type="text"
                                placeholder="Alternate Contact Number"
                                value={formData.alternateContactNumber}
                                onChange={handleChange('alternateContactNumber')}
                            />
                        </div>

                        <div className="quick-add-field">
                            <label>Email Id</label>
                            <input
                                type="email"
                                placeholder="Email Id"
                                value={formData.emailId}
                                onChange={handleChange('emailId')}
                            />
                        </div>

                        <div className="quick-add-field">
                            <label>Program<span className="required">*</span></label>
                            <div className="quick-add-select-wrapper">
                                <select
                                    value={formData.program_id}
                                    onChange={handleChange('program_id')}
                                    disabled={programs.loading}
                                >
                                    <option value="">Select Program</option>
                                    {(programs.data || []).filter((p) => p.is_active !== false).map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                {formData.program_id && (
                                    <button className="select-clear" onClick={handleClearSelect('program_id')}>&times;</button>
                                )}
                                <span className="select-arrow">&#9662;</span>
                            </div>
                        </div>

                        <div className="quick-add-field">
                            <label>Channel<span className="required">*</span></label>
                            <div className="quick-add-select-wrapper">
                                <select
                                    value={formData.channel_id}
                                    onChange={handleChange('channel_id')}
                                    disabled={channels.loading}
                                >
                                    <option value="">Select Channel</option>
                                    {(channels.data || []).filter((c) => c.is_active !== false).map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {formData.channel_id && (
                                    <button className="select-clear" onClick={handleClearSelect('channel_id')}>&times;</button>
                                )}
                                <span className="select-arrow">&#9662;</span>
                            </div>
                        </div>

                        <div className="quick-add-field">
                            <label>Source<span className="required">*</span></label>
                            <div className="quick-add-select-wrapper">
                                <select
                                    value={formData.source_id}
                                    onChange={handleChange('source_id')}
                                    disabled={sources.loading}
                                >
                                    <option value="">Select Source</option>
                                    {(sources.data || []).filter((s) => s.is_active !== false).map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                {formData.source_id && (
                                    <button className="select-clear" onClick={handleClearSelect('source_id')}>&times;</button>
                                )}
                                <span className="select-arrow">&#9662;</span>
                            </div>
                        </div>
                    </div>

                    <div className="quick-add-checkboxes">
                        <label className="quick-add-checkbox">
                            <input
                                type="checkbox"
                                checked={formData.sendWelcomeEmail}
                                onChange={handleCheckbox('sendWelcomeEmail')}
                            />
                            Send Welcome Email
                        </label>
                        <label className="quick-add-checkbox">
                            <input
                                type="checkbox"
                                checked={formData.sendWelcomeSMS}
                                onChange={handleCheckbox('sendWelcomeSMS')}
                            />
                            Send Welcome SMS
                        </label>
                    </div>

                    {error && (
                        <div style={{ padding: '12px 24px', color: '#d32f2f', fontSize: 13, background: '#fff5f5', borderTop: '1px solid #ffd9d9' }}>
                            {error}
                        </div>
                    )}
                </DialogContent>

                <DialogActions className="quick-add-footer" sx={{ padding: 0 }}>
                    <button className="quick-add-btn quick-add-btn-outline" onClick={handleSaveAndClose} disabled={submitting}>
                        {submitting ? 'Saving…' : 'Save & Close'}
                    </button>
                    <button className="quick-add-btn quick-add-btn-filled" onClick={handleSaveAndAddMore} disabled={submitting}>
                        {submitting ? 'Saving…' : 'Save & Add More'}
                    </button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={!!toast}
                autoHideDuration={3000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {toast && <Alert severity={toast.severity}>{toast.text}</Alert>}
            </Snackbar>
        </>
    );
};

export default QuickAdd;
