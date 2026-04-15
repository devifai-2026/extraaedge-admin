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

const VideoCallModal = ({ open, onClose, lead }) => {
    const [tab, setTab] = React.useState(0);
    const [sendEmail, setSendEmail] = React.useState(true);
    const [sendSMS, setSendSMS] = React.useState(false);

    const smsText = `Hello ${lead?.name || ""}, Divya Nair from Speedup Infotech, Pune is inviting you for the video conferencing call kindly click on link to join https://videocall.extraedge.com/31495669%20-%20Counselling%20Room%20of%20Divya. Contact Divya Nair counsellor4@speedupinfotech.com 8669012416`;

    const handleCopy = () => {
        navigator.clipboard.writeText(tab === 0 ? "Email Invite" : smsText);
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
                    color: "var(--white)",
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

                {/* EMAIL PREVIEW */}
                {tab === 0 && (
                    <div
                        style={{
                            border: "1px solid #eee",
                            padding: "20px",
                            marginTop: "10px",
                            maxHeight: "400px",
                            overflowY: "auto",
                            background: "#fafafa"
                        }}
                    >
                        <div style={{ textAlign: "center", marginBottom: "10px" }}>
                            <img
                                src="https://via.placeholder.com/200x60?text=LOGO"
                                alt="logo"
                            />
                        </div>

                        <div
                            style={{
                                background: colors.primary,
                                color: colors.white,
                                padding: "10px",
                                textAlign: "center",
                                fontWeight: 600
                            }}
                        >
                            VIDEO CALL INVITE
                        </div>

                        <p style={{ paddingTop: "15px" }}>Dear {lead?.name || "User"},</p>

                        <p style={{paddingBottom:"10px"}}>Thank you for showing interest in our institute.</p>

                        <p style={{paddingBottom:"10px"}}>
                            Divya Nair is inviting you for the video counselling call.
                            Kindly click on below link to join the call.
                        </p>

                        <div style={{ textAlign: "center", margin: "20px 0" }}>
                            <Button variant="contained" color="error">
                                CLICK HERE TO JOIN CALL
                            </Button>
                        </div>

                        <p style={{paddingBottom:"10px"}}>
                            In case you are facing any trouble or having any admission-related queries,
                            feel free to reach out between 09:00 AM to 6:00 PM (Mon–Sat).
                        </p>

                        <p>
                            Regards,<br />Team
                        </p>
                    </div>
                )}

                {/* SMS PREVIEW */}
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
                                color: "#333",
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
                            color: colors.white
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