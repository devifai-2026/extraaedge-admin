import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import { colors } from "../../theme/colors";

const data = [
  {
    program: "MERN Stack Training and Certification",
    total: 3,
    cold: 1,
    new: 1,
    visited: 1
  },
  {
    program: "Python Full Stack Training",
    total: 1,
    cold: 0,
    new: 1,
    visited: 0
  },
  {
    program: "Data Science Training",
    total: 1,
    cold: 1,
    new: 0,
    visited: 0
  },
  {
    program: "Data Analyst Training",
    total: 4,
    cold: 2,
    new: 2,
    visited: 0
  },
  {
    program: "Yet to decide",
    total: 2,
    cold: 0,
    new: 2,
    visited: 0
  }
];

export default function LeadToggleTable() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{backgroundColor: colors.white , padding:"10px" , borderRadius:"8px" , border:`1px solid ${colors.borderGrey}`}}>
      
      <div style={{display:'flex', justifyContent:'space-between' , alignItems:'center' , marginBottom:'10px'}}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Typography variant="h6" fontWeight="bold">
            Program Vs Lead Status Analysis [MD-114]
          </Typography>
          <InfoOutlinedIcon fontSize="small" color="action" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <RefreshIcon sx={{ color: colors.primary }} />
          <Typography variant="body2" sx={{ color: colors.primary }}>
            Last synced: 06:16 PM
          </Typography>
          <IconButton size="small" sx={{ color: colors.primary }}>
            <DownloadIcon />
          </IconButton>
        </div>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            {/* Top Header */}
            <TableRow>
              <TableCell />
              <TableCell />

              <TableCell
                colSpan={open ? 3 : 1}
                align="center"
                sx={{
                  backgroundColor: colors.primary,
                  color: colors.white,
                  fontWeight: "bold"
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="center">
                  Lead
                  <IconButton
                    size="small"
                    onClick={() => setOpen(!open)}
                    sx={{ color: colors.white, ml: 1 }}
                  >
                    {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>

            {/* Column Headers */}
            <TableRow sx={{ backgroundColor: colors.primary }}>
              <TableCell sx={{ color: colors.white }}>Program</TableCell>
              <TableCell sx={{ color: colors.white }}>Total</TableCell>

              {open ? (
                <>
                  <TableCell sx={{ color: colors.white }}>Cold</TableCell>
                  <TableCell sx={{ color: colors.white }}>New</TableCell>
                  <TableCell sx={{ color: colors.white }}>Visited</TableCell>
                </>
              ) : (
                <TableCell sx={{ color: colors.white }}>Total</TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.program}</TableCell>
                <TableCell>{row.total}</TableCell>

                {open ? (
                  <>
                    <TableCell>{row.cold}</TableCell>
                    <TableCell>{row.new}</TableCell>
                    <TableCell>{row.visited}</TableCell>
                  </>
                ) : (
                  <TableCell>{row.total}</TableCell>
                )}
              </TableRow>
            ))}

            {/* Total Row */}
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Total</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>11</TableCell>

              {open ? (
                <>
                  <TableCell sx={{ fontWeight: "bold" }}>4</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>6</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>1</TableCell>
                </>
              ) : (
                <TableCell sx={{ fontWeight: "bold" }}>11</TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}