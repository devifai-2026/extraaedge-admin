import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { colors } from "../../theme/colors";

const EditConfirmModal = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{ sx: { borderRadius: "10px", width: 680 } }}
    >
      <DialogTitle
        sx={{
          background: "#fbe9da",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 600,
          py: 1.5
        }}
      >
        Edit Automation Workflow
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Typography fontWeight={600} sx={{ mb: 1, mt: 1 }}>
          Do you want to update the rule?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          After editing the rule all the existing lead will not receive communication
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            textTransform: "none",
            borderRadius: "6px",
            color: colors.primary,
            borderColor: colors.primary
          }}
        >
          No
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            textTransform: "none",
            borderRadius: "6px",
            backgroundColor: colors.primary,
            "&:hover": { backgroundColor: colors.primaryDark }
          }}
        >
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditConfirmModal;
