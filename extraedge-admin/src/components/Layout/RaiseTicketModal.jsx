import { useState, useRef } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { colors } from '../../theme/colors';
import './RaiseTicketModal.css';

function RaiseTicketModal({ open, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    product: '',
    crmDomain: '',
    description: '',
  });
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected].slice(0, 5));
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit logic here
    console.log('Ticket submitted:', formData, files);
    onClose();
  };

  return (
    <div className="ticket-overlay" onClick={onClose}>
      <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ticket-header" style={{ backgroundColor: colors.primary }}>
          <h2 className="ticket-header-title">Welcome to ExtraaEdge</h2>
          <button className="ticket-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="ticket-body">
          <h3 className="ticket-form-title">Raise a Ticket</h3>

          <form onSubmit={handleSubmit}>
            <div className="ticket-field">
              <label>Your name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="ticket-field">
              <label>
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="ticket-field">
              <label>
                Subject <span className="required">*</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              />
            </div>

            <div className="ticket-field">
              <label>
                Product <span className="required">*</span>
              </label>
              <select
                name="product"
                value={formData.product}
                onChange={handleChange}
                required
              >
                <option value="">--</option>
                <option value="crm">CRM</option>
                <option value="marketing">Marketing Automation</option>
                <option value="analytics">Analytics</option>
              </select>
            </div>

            <div className="ticket-field">
              <label>
                Enter your CRM Domain Url (e.g. abc.extraaedge.com){' '}
                <span className="required">*</span>
              </label>
              <input
                type="text"
                name="crmDomain"
                value={formData.crmDomain}
                onChange={handleChange}
                required
              />
            </div>

            <div className="ticket-field">
              <label>
                Description <span className="required">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                required
              />
            </div>

            {/* File Upload */}
            <div
              className="ticket-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUploadIcon style={{ fontSize: 40, color: colors.midGrey }} />
              <p className="upload-title">Upload files (max 5)</p>
              <p className="upload-subtitle">Click to add or drag & drop files.</p>
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

            <button
              type="submit"
              className="ticket-submit-btn"
              style={{ backgroundColor: colors.primary }}
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RaiseTicketModal;
