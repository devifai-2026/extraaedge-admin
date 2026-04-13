import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import './QuickAdd.css'

const programOptions = [
    'Data Analyst Training And Certification',
    'Advanced Python Development',
    'Full Stack Web Development',
    'Data Science with ML',
    'UI/UX Design Bootcamp',
]

const channelOptions = ['Offline', 'Online', 'Direct', 'Facebook', 'Google Ads', 'LinkedIn', 'Email Campaign']

const sourceOptions = ['Direct Walkin', 'Website', 'Social Media', 'Professional Network', 'Newsletter', 'Referral']

const initialFormData = {
    applicantName: '',
    whatsappNumber: '',
    alternateContactNumber: '',
    emailId: '',
    program: '',
    channel: '',
    source: '',
    sendWelcomeEmail: false,
    sendWelcomeSMS: false,
}

const QuickAdd = ({ open, onClose }) => {
    const [formData, setFormData] = useState(initialFormData)

    const handleChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }))
    }

    const handleCheckbox = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.checked }))
    }

    const handleClearSelect = (field) => () => {
        setFormData((prev) => ({ ...prev, [field]: '' }))
    }

    const resetAndClose = () => {
        setFormData(initialFormData)
        onClose()
    }

    const handleSaveAndClose = () => {
        onClose(formData)
        setFormData(initialFormData)
    }

    const handleSaveAndAddMore = () => {
        console.log('Saved:', formData)
        setFormData(initialFormData)
    }

    return (
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
                                value={formData.program}
                                onChange={handleChange('program')}
                            >
                                <option value="" disabled>Select Program</option>
                                {programOptions.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                            {formData.program && (
                                <button className="select-clear" onClick={handleClearSelect('program')}>&times;</button>
                            )}
                            <span className="select-arrow">&#9662;</span>
                        </div>
                    </div>

                    <div className="quick-add-field">
                        <label>Channel<span className="required">*</span></label>
                        <div className="quick-add-select-wrapper">
                            <select
                                value={formData.channel}
                                onChange={handleChange('channel')}
                            >
                                <option value="" disabled>Select Channel</option>
                                {channelOptions.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            {formData.channel && (
                                <button className="select-clear" onClick={handleClearSelect('channel')}>&times;</button>
                            )}
                            <span className="select-arrow">&#9662;</span>
                        </div>
                    </div>

                    <div className="quick-add-field">
                        <label>Source<span className="required">*</span></label>
                        <div className="quick-add-select-wrapper">
                            <select
                                value={formData.source}
                                onChange={handleChange('source')}
                            >
                                <option value="" disabled>Select Source</option>
                                {sourceOptions.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            {formData.source && (
                                <button className="select-clear" onClick={handleClearSelect('source')}>&times;</button>
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
            </DialogContent>

            <DialogActions className="quick-add-footer" sx={{ padding: 0 }}>
                <button className="quick-add-btn quick-add-btn-outline" onClick={handleSaveAndClose}>
                    Save &amp; Close
                </button>
                <button className="quick-add-btn quick-add-btn-filled" onClick={handleSaveAndAddMore}>
                    Save &amp; Add More
                </button>
            </DialogActions>
        </Dialog>
    )
}

export default QuickAdd
