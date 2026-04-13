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
import Collapse from "@mui/material/Collapse";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import { colors } from "../../theme/colors";

const data = [
  {
    id: 1,
    channel: "Offline (2)",
    totalLeads: 10,
    enrolled: 0,
    percent: 0,
    children: [
      { name: "Direct Walkin", totalLeads: 1 },
      { name: "Social Media", totalLeads: 9 }
    ]
  },
  {
    id: 2,
    channel: "Online (1)",
    totalLeads: 1,
    enrolled: 0,
    percent: 0,
    children: [
      { name: "Website Inquiry", totalLeads: 1 }
    ]
  }
];

export default function ChannelExpandableTable() {
  const [openRows, setOpenRows] = useState({});

  const handleToggle = (id) => {
    setOpenRows((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div style={{backgroundColor: colors.white , padding:"10px" , borderRadius:"8px" , border:`1px solid ${colors.borderGrey}`}}>
      {/* <Typography variant="h6" fontWeight="bold" mb={2}>
        Channel-Source wise Conversion Analysis
      </Typography> */}
      <div style={{display:'flex', justifyContent:'space-between' , alignItems:'center' , marginBottom:'10px'}}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Typography variant="h6" fontWeight="bold">
            Channel-Source wise Conversion Analysis
          </Typography>
          <InfoOutlinedIcon fontSize="small" color="action" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <RefreshIcon color="warning" />
          <Typography variant="body2">
            Last synced: 06:16 PM
          </Typography>
          <IconButton size="small">
            <DownloadIcon />
          </IconButton>
        </div>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: colors.darkGrey }}>
              <TableCell sx={{ color: colors.white }}>Primary Channel</TableCell>
              <TableCell sx={{ color: colors.white }}>Total Leads</TableCell>
              <TableCell sx={{ color: colors.white }}>Enrolled Leads</TableCell>
              <TableCell sx={{ color: colors.white }}>
                Lead To Enrolled Leads %
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map((row) => (
              <React.Fragment key={row.id}>
                
                {/* Parent Row */}
                <TableRow
                  sx={{
                    backgroundColor: openRows[row.id]
                      ? colors.primaryLight
                      : "inherit"
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <IconButton
                        size="small"
                        onClick={() => handleToggle(row.id)}
                      >
                        {openRows[row.id] ? (
                          <KeyboardArrowDownIcon />
                        ) : (
                          <KeyboardArrowRightIcon />
                        )}
                      </IconButton>
                      {row.channel}
                    </Box>
                  </TableCell>
                  <TableCell>{row.totalLeads}</TableCell>
                  <TableCell>{row.enrolled}</TableCell>
                  <TableCell>{row.percent}</TableCell>
                </TableRow>

                {/* Child Rows */}
                <TableRow>
                  <TableCell colSpan={4} sx={{ p: 0 }}>
                    <Collapse in={openRows[row.id]} timeout="auto" unmountOnExit>
                      <Table size="small">
                        <TableBody>
                          {row.children.map((child, i) => (
                            <TableRow
                              key={i}
                              sx={{ backgroundColor: colors.primaryLight }}
                            >
                              <TableCell sx={{ pl: 6 }}>
                                {child.name}
                              </TableCell>
                              <TableCell>{child.totalLeads}</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Collapse>
                  </TableCell>
                </TableRow>

              </React.Fragment>
            ))}

            {/* Total Row */}
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Total</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>11</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>0</TableCell>
              <TableCell />
            </TableRow>

          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}