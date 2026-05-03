import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Tabs,
    Tab,
    Checkbox,
    Button
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { colors } from "../../theme/colors";
import EditIcon from "@mui/icons-material/Edit";

const VideoCallModal = ({ open, onClose, lead }) => {
    const [tab, setTab] = React.useState(0);
    const [sendEmail, setSendEmail] = React.useState(true);
    const [sendSMS, setSendSMS] = React.useState(false);

    // ✅ EDIT STATE
    const [isEditing, setIsEditing] = React.useState(false);

    const [emailContent, setEmailContent] = React.useState({
        subject: "VIDEO CALL INVITE",
        body: `Dear ${lead?.name || "User"},

Thank you for showing interest in our institute.

Divya Nair is inviting you for the video counselling call.
Kindly click on below link to join the call.

In case you are facing any trouble or having any admission-related queries,
feel free to reach out between 09:00 AM to 6:00 PM (Mon–Sat).

Regards,
Team`
    });

    const smsText = `Hello ${lead?.name || ""}, Divya Nair from Speedup Infotech, Pune is inviting you for the video conferencing call kindly click on link to join https://videocall.extraedge.com/31495669`;

    const handleCopy = () => {
        navigator.clipboard.writeText(tab === 0 ? emailContent.body : smsText);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            {/* HEADER */}
            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "var(--primary)",
                    color: "#fff",
                }}
            >
                Send Video Conferencing Invite
                <IconButton onClick={onClose}>
                    <CloseIcon sx={{ color: "#fff" }} />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {/* CHECKBOX */}
                <div style={{ display: "flex", gap: "20px", margin: "10px 0", alignItems: "center" }}>
                    <label>
                        <Checkbox
                            checked={sendEmail}
                            onChange={(e) => {
                                setSendEmail(e.target.checked);
                                if (e.target.checked) setTab(0);
                            }}
                        />
                        Send Email
                    </label>

                    <label>
                        <Checkbox
                            checked={sendSMS}
                            onChange={(e) => {
                                setSendSMS(e.target.checked);
                                if (e.target.checked) setTab(1);
                            }}
                        />
                        Send SMS
                    </label>

                    <span
                        onClick={handleCopy}
                        style={{
                            marginLeft: "auto",
                            color: colors.primary,
                            cursor: "pointer",
                            fontWeight: 500
                        }}
                    >
                        Copy Invite
                    </span>
                </div>

                {/* TABS */}
                <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Email" />
                    <Tab label="SMS" />
                </Tabs>

                {/* ================= EMAIL ================= */}
                {tab === 0 && (
                    <div
                        style={{
                            border: "1px solid #eee",
                            padding: "20px",
                            marginTop: "10px",
                            maxHeight: "400px",
                            overflowY: "auto",
                            background: "#fafafa",
                            position: "relative"
                        }}
                    >
                        {/* ✏️ EDIT BUTTON */}
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setIsEditing(!isEditing)}
                            style={{
                                position: "absolute",
                                top: "10px",
                                right: "10px",
                                textTransform: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                background: "var(--primary)",
                                color:"var(--white)"
                            }}
                        >
                            {isEditing ? (
                                <>
                                    <CloseIcon fontSize="small" sx={{ background:colors.primary }} />
                                    Cancel
                                </>
                            ) : (
                                <>
                                    <EditIcon fontSize="small" sx={{ background:colors.primary }}/>
                                    Edit
                                </>
                            )}
                        </Button>

                        {/* LOGO */}
                        <div style={{ textAlign: "center", marginBottom: "10px" }}>
                            <img
                                src="https://via.placeholder.com/200x60?text=LOGO"
                                alt="logo"
                            />
                        </div>

                        {/* SUBJECT */}
                        <div
                            style={{
                                background: colors.primary,
                                color: "#fff",
                                padding: "10px",
                                textAlign: "center",
                                fontWeight: 600
                            }}
                        >
                            {isEditing ? (
                                <input
                                    value={emailContent.subject}
                                    onChange={(e) =>
                                        setEmailContent({ ...emailContent, subject: e.target.value })
                                    }
                                    style={{
                                        width: "100%",
                                        border: "none",
                                        outline: "none",
                                        textAlign: "center",
                                        fontWeight: 600
                                    }}
                                />
                            ) : (
                                emailContent.subject
                            )}
                        </div>

                        {/* BODY */}
                        {isEditing ? (
                            <textarea
                                value={emailContent.body}
                                onChange={(e) =>
                                    setEmailContent({ ...emailContent, body: e.target.value })
                                }
                                style={{
                                    width: "100%",
                                    height: "200px",
                                    marginTop: "15px",
                                    border: "1px solid #ddd",
                                    padding: "10px",
                                    fontSize: "14px"
                                }}
                            />
                        ) : (
                            <div style={{ marginTop: "15px", whiteSpace: "pre-line" }}>
                                {emailContent.body}
                            </div>
                        )}

                        {/* CTA BUTTON */}
                        {!isEditing && (
                            <div style={{ textAlign: "center", margin: "20px 0" }}>
                                <Button variant="contained" color="error">
                                    CLICK HERE TO JOIN CALL
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* ================= SMS ================= */}
                {tab === 1 && (
                    <div
                        style={{
                            border: "1px solid #eee",
                            padding: "15px",
                            marginTop: "10px",
                            height: "300px",
                            background: "#f5f5f5",
                        }}
                    >
                        <textarea
                            style={{
                                width: "100%",
                                height: "100%",
                                border: "none",
                                outline: "none",
                                resize: "none",
                                background: "transparent",
                                fontSize: "14px",
                                lineHeight: "1.5",
                            }}
                            defaultValue={smsText}
                        />
                    </div>
                )}

                {/* FOOTER */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "10px",
                        marginTop: "15px"
                    }}
                >
                    <Button variant="outlined">
                        Save and Invite
                    </Button>

                    <Button
                        variant="contained"
                        sx={{
                            backgroundColor: colors.primary,
                            color: "#fff"
                        }}
                    >
                        Start Call
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default VideoCallModal;