import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  Typography,
  IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const CallModal = ({ open, onClose, lead }) => {
  const [selected, setSelected] = useState("lead");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      
      {/* HEADER */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#d9ccc5",
          fontWeight: 600
        }}
      >
        Call Lead/Applicant
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* BODY */}
      <DialogContent sx={{ mt: 2 }}>
        <Typography sx={{ mb: 2, fontSize: "14px" }}>
          Select number to call
        </Typography>

        <RadioGroup
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          row
        >
          <FormControlLabel
            value="lead"
            control={<Radio />}
            label={
              <div>
                <div>Lead</div>
                <div style={{ fontSize: "12px", color: "#777" }}>
                  {lead.phone}
                </div>
              </div>
            }
          />

          {/* You can replace with real alternate number */}
          <FormControlLabel
            value="alternate"
            control={<Radio />}
            label={
              <div>
                <div>Alternate</div>
                <div style={{ fontSize: "12px", color: "#777" }}>
                  8468894320
                </div>
              </div>
            }
          />
        </RadioGroup>
      </DialogContent>

      {/* FOOTER */}
      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          CANCEL
        </Button>
        <Button
          variant="contained"
          sx={{ background: "#f07c2b" }}
          onClick={() => {
            console.log("Calling:", selected);
            onClose();
          }}
        >
          CALL
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CallModal;