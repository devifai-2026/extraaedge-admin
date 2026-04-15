import React from "react";
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
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import { colors } from "../../theme/colors";

const data = [
  {
    program: "MERN Stack Training and Certification",
    totalLeads: 3,
    enrolled: 0,
    percent: 0,
  },
  {
    program: "Python Full Stack Training and Certification",
    totalLeads: 1,
    enrolled: 0,
    percent: 0,
  },
  {
    program: "Data Science Training and Certification",
    totalLeads: 1,
    enrolled: 0,
    percent: 0,
  },
  {
    program: "Data Analyst Training and Certification",
    totalLeads: 4,
    enrolled: 0,
    percent: 0,
  },
  {
    program: "Yet to decide",
    totalLeads: 2,
    enrolled: 0,
    percent: 0,
  },
];

const total = {
  totalLeads: 11,
  enrolled: 0,
};

export default function ProgramTable() {
  return (
    <div style={{backgroundColor: colors.white , padding:"10px" , borderRadius:"8px" , border:`1px solid ${colors.borderGrey}`}}>
      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between' , alignItems:'center' , marginBottom:'10px'}}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Typography variant="h6" fontWeight="bold">
            Program wise Conversion Analysis [MD-111]
          </Typography>
          <InfoOutlinedIcon fontSize="small" color="action" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <RefreshIcon sx={{ color: colors.primary }}/>
          <Typography variant="body2" sx={{ color: colors.primary }}>
            Last synced: 06:16 PM
          </Typography>
          <IconButton size="small" sx={{ color: colors.primary }}>
            <DownloadIcon />
          </IconButton>
        </div>
      </div>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: colors.primary }}>
              <TableCell sx={{ color: colors.white, fontWeight: "bold" }}>
                Program
              </TableCell>
              <TableCell sx={{ color: colors.white, fontWeight: "bold" }}>
                Total Leads
              </TableCell>
              <TableCell sx={{ color: colors.white, fontWeight: "bold" }}>
                Enrolled Leads
              </TableCell>
              <TableCell sx={{ color: colors.white, fontWeight: "bold" }}>
                Lead To Enrolled Leads %
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={index}
                sx={{
                  backgroundColor: row.highlight
                    ? colors.primaryLight
                    : "inherit",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: colors.hoverGrey,
                  },
                }}
              >
                <TableCell>{row.program}</TableCell>
                <TableCell>{row.totalLeads}</TableCell>
                <TableCell>{row.enrolled}</TableCell>
                <TableCell>{row.percent}</TableCell>
              </TableRow>
            ))}

            {/* Total Row */}
            <TableRow
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: colors.hoverGrey,
                },
              }}
            >
              <TableCell sx={{ fontWeight: "bold" }}>Total</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                {total.totalLeads}
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                {total.enrolled}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}