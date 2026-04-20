import React, { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import "./AddIntegrationDialog.css";

const INTEGRATION_TYPES = [
  { value: "crm", label: "CRM" },
  { value: "payment", label: "Payment Gateway" },
  { value: "sms", label: "SMS Provider" },
  { value: "email", label: "Email Provider" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "analytics", label: "Analytics" },
  { value: "other", label: "Other" },
];

const AddIntegrationDialog = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
  });
  const [errors, setErrors] = useState({});

  if (!open) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSave = () => {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = "Integration name is required";
    if (!formData.type) nextErrors.type = "Integration type is required";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave?.(formData);
    handleReset();
  };

  const handleReset = () => {
    setFormData({ name: "", type: "", description: "" });
    setErrors({});
  };

  const handleCancel = () => {
    handleReset();
    onClose?.();
  };

  return (
    <div className="aid-overlay" onClick={handleCancel}>
      <div className="aid-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="aid-header">
          <div>
            <h2 className="aid-title">Add New Integration</h2>
            <p className="aid-subtitle">Set up a new integration</p>
          </div>
          <button
            type="button"
            className="aid-close-btn"
            onClick={handleCancel}
            aria-label="Close"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="aid-body">
          <div className="aid-field">
            <label className="aid-label">
              <span className="aid-required">*</span> Integration Name
            </label>
            <input
              type="text"
              className={`aid-input ${errors.name ? "aid-input-error" : ""}`}
              placeholder="Enter integration name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
            {errors.name && <span className="aid-error-msg">{errors.name}</span>}
          </div>

          <div className="aid-field">
            <label className="aid-label">
              <span className="aid-required">*</span> Integration Type
            </label>
            <select
              className={`aid-input aid-select ${errors.type ? "aid-input-error" : ""}`}
              value={formData.type}
              onChange={(e) => handleChange("type", e.target.value)}
            >
              <option value="">Select integration type</option>
              {INTEGRATION_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.type && <span className="aid-error-msg">{errors.type}</span>}
          </div>

          <div className="aid-field">
            <label className="aid-label">Description</label>
            <textarea
              className="aid-input aid-textarea"
              placeholder="Enter integration description"
              rows={4}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>
        </div>

        <div className="aid-footer">
          <button type="button" className="aid-save-btn" onClick={handleSave}>
            <SaveIcon fontSize="small" />
            <span>Save Integration</span>
          </button>
          <button type="button" className="aid-cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddIntegrationDialog;
