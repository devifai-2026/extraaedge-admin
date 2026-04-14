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

const VideoCallModal = ({ open, onClose, lead }) => {
    const [tab, setTab] = React.useState(0);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            {/* HEADER */}
            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#e9dfd7"
                }}
            >
                Send Video Conferencing Invite
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {/* CHECKBOX */}
                <div style={{ display: "flex", gap: "20px", margin: "10px 0" }}>
                    <label>
                        <Checkbox /> Send Email
                    </label>
                    <label>
                        <Checkbox /> Send SMS
                    </label>

                    <span style={{ marginLeft: "auto", color: "#ff6b00", cursor: "pointer" }}>
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

                        <div style={{ background: "red", color: "#fff", padding: "10px", textAlign: "center" }}>
                            VIDEO CALL INVITE
                        </div>

                        <p style={{paddingBottom:"10px"}}>Dear {lead?.name},</p>

                        <p style={{paddingBottom:"10px"}}>Thank you for showing interest in our institute.</p>
                        <p style={{paddingBottom:"10px"}}>Divya Nair is inviting you for the video counselling call. Kindly click on below link to join the call.</p>
                        <div style={{ textAlign: "center", margin: "20px 0" }}>
                            <Button variant="contained" color="error">
                                CLICK HERE TO JOIN CALL
                            </Button>
                        </div>


                        <p style={{paddingBottom:"10px"}}>
                            In case you are facing any trouble or having any admission-related queries feel free to reach out to us between 09:00 AM to 6:00 PM from Monday to Saturday.
                        </p>


                        <p>Regards,<br />Team</p>
                    </div>
                )}

                {/* FOOTER */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" }}>
                    <Button variant="outlined">Save and Invite</Button>
                    <Button variant="contained" color="warning">
                        Start Call
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default VideoCallModal;