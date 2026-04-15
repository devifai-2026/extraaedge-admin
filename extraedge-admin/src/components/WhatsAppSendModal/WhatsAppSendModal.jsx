import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    IconButton,
    Tabs,
    Tab,
    Radio,
    Button,
    TextField,
    MenuItem
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./WhatsAppSendModal.css";

const WhatsAppSendModal = ({ open, onClose, data }) => {
    const [tab, setTab] = useState(0);
    const [selectedNumber, setSelectedNumber] = useState("self");
    const [message, setMessage] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState("");

    const { lead, usage = [], templates = [] } = data || {};

    // Phone options dynamic
    const phoneOptions = [
        { key: "self", label: "WhatsApp Number", value: lead?.phone },
        { key: "father", label: "Father's Number", value: lead?.fatherPhone },
        { key: "mother", label: "Mother's Number", value: lead?.motherPhone },
        { key: "alt", label: "Alternate Number", value: lead?.altPhone }
    ];

    // Auto fill message when template changes
    const handleTemplateChange = (e) => {
        const value = e.target.value;
        setSelectedTemplate(value);

        const selected = templates.find((t) => t.id === value);
        setMessage(selected?.message || "");
    };

    // Reset on open
    useEffect(() => {
        if (open) {
            setTab(0);
            setSelectedNumber("self");
            setMessage("");
            setSelectedTemplate("");
        }
    }, [open]);

    const handleSend = () => {
        const selectedPhone = phoneOptions.find(
            (p) => p.key === selectedNumber
        );

        console.log("SEND DATA:", {
            phone: selectedPhone?.value,
            message
        });

        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogContent className="wa-modal">

                {/* HEADER */}
                <div className="wa-modal-header">
                    <h2>WhatsApp Chat</h2>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </div>

                {/* TABS */}
                <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Enterprise" />
                    <Tab label="Non-enterprise" />
                </Tabs>

                {/* ================= ENTERPRISE ================= */}
                {tab === 0 && (
                    <>
                        <h4 className="section-title">Count Stage</h4>

                        <table className="wa-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Used</th>
                                    <th>Available</th>
                                    <th>Total</th>
                                </tr>
                            </thead>

                            <tbody>
                                {usage.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.label}</td>
                                        <td>{item.used}</td>
                                        <td>{item.available}</td>
                                        <td>{item.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <h4 className="section-title">
                            Select the WhatsApp No to send
                        </h4>

                        <div className="radio-group">
                            {phoneOptions.map(
                                (opt) =>
                                    opt.value && (
                                        <div key={opt.key}>
                                            <Radio
                                                checked={selectedNumber === opt.key}
                                                onChange={() => setSelectedNumber(opt.key)}
                                            />
                                            {opt.label}
                                        </div>
                                    )
                            )}
                        </div>

                        <h4 className="section-title">
                            Do you want to send the Business Initiated Messages (BIM)?
                        </h4>

                        <div className="wa-footer">
                            <Button variant="outlined" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button variant="contained" className="submit-btn">
                                Submit
                            </Button>
                        </div>
                    </>
                )}

                {/* ================= NON ENTERPRISE ================= */}
                {tab === 1 && (
                    <>
                        <h4 className="section-title">
                            Select the WhatsApp No to send
                        </h4>

                        <div className="radio-group">
                            {phoneOptions.map(
                                (opt) =>
                                    opt.value && (
                                        <div key={opt.key}>
                                            <Radio
                                                checked={selectedNumber === opt.key}
                                                onChange={() => setSelectedNumber(opt.key)}
                                            />
                                            {opt.label}
                                        </div>
                                    )
                            )}
                        </div>
                        <div style={{ margin: "10px" }}>
                            <TextField
                                fullWidth
                                select
                                label="Select WhatsApp Template"
                                margin="normal"
                                value={selectedTemplate}
                                onChange={handleTemplateChange}

                            >
                                {templates.map((tpl) => (
                                    <MenuItem key={tpl.id} value={tpl.id}>
                                        {tpl.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </div>
                        <div style={{ margin: "10px" }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={6}
                                label="Message"
                                margin="normal"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>



                        <div className="wa-footer">
                            <Button variant="outlined" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                className="submit-btn"
                                onClick={handleSend}
                            >
                                Send WhatsApp
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default WhatsAppSendModal;