import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Checkbox,
  FormControlLabel,
  Radio,
  TextField
} from "@mui/material";

const WhatsappModal = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      
      {/* HEADER */}
      <DialogTitle className="whatsApp-filters">
        WhatsApp Chat
      </DialogTitle>

      {/* CONTENT */}
      <DialogContent
        dividers
        sx={{ maxHeight: "520px", overflowY: "auto", px: 3 }}
      >
        {/* COUNT STAGE */}
        <Typography fontWeight={600} mb={1}>
          Count Stage
        </Typography>

        <TableContainer
          sx={{ border: "1px solid #f87474", borderRadius: "6px", mb: 2 }}
        >
          <Table size="small">
            <TableHead className="tablehead-whatapp-filters">
              <TableRow>
                <TableCell></TableCell>
                <TableCell align="center">Used</TableCell>
                <TableCell align="center">Available</TableCell>
                <TableCell align="center">Total</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {[
                ["Monthly Business Initiated Messages", 0, 3000, 3000],
                ["Daily Business Initiated Messages", 0, 100, 100],
                ["Monthly Session Messages", 0, 6000, 6000],
                ["Daily Session Messages", 0, 200, 200],
              ].map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row[0]}</TableCell>
                  <TableCell align="center">{row[1]}</TableCell>
                  <TableCell align="center">{row[2]}</TableCell>
                  <TableCell align="center">{row[3]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* CHECKBOX */}
        <Typography fontWeight={600}>
          Select the WhatsApp No to send
        </Typography>

        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 2 }}>
          <FormControlLabel control={<Checkbox />} label="WhatsApp Number" />
          <FormControlLabel control={<Checkbox />} label="Father's Number" />
          <FormControlLabel control={<Checkbox />} label="Mother's Number" />
          <FormControlLabel control={<Checkbox />} label="WhatsApp No" />
        </Box>

        {/* RADIO */}
        <Typography fontWeight={600}>
          Select a user to receive students response
        </Typography>

        <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
          <FormControlLabel control={<Radio defaultChecked />} label="Sender" />
          <FormControlLabel control={<Radio />} label="Current Lead Owner" />
        </Box>

        {/* TEMPLATE */}
        <Typography>Select WhatsApp Template</Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Select WhatsApp Template"
          sx={{ mb: 2 }}
        />

        {/* RETRY */}
        <Typography>
          WhatsApp Retry Attempts <span style={{ color: "red" }}>*</span>
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Enter number of retry attempts"
          sx={{ mb: 2 }}
        />

        {/* MESSAGE */}
        <Typography>Message</Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Message"
          sx={{ mb: 2 }}
        />

        {/* FOOTER TEXT */}
        <Typography fontWeight={500}>
          Do you want to send WhatsApp Message to 1338 Leads?
        </Typography>
      </DialogContent>

      {/* FOOTER */}
      <DialogActions sx={{ px: 3, py: 2, justifyContent: "flex-end", gap: 2 }}>
        <Button onClick={onClose}>CANCEL</Button>

        <Button
          variant="contained"
          className="whatsApp-filters-send-btn"
        >
          SEND WHATSAPP
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsappModal;