import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from "recharts";
import { Box, Typography, IconButton } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import RefreshIcon from "@mui/icons-material/Refresh";

const data = [
  { name: "Not Interested, got job", value: 4 }
];

export default function PerfectDonutLayout() {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Box
      sx={{
        border: "1px solid #e0e0e0",
        borderRadius: 1,
        p: 2,
        bgcolor: "#fff",
      }}
    >
      {/* Header Row */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
            Top Reasons for Cold Enquiries - (Lead List) [MD-123]
          </Typography>
          <InfoOutlinedIcon sx={{ fontSize: 16, color: "#999" }} />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <RefreshIcon sx={{ fontSize: 18, color: "#ef6c00", cursor: "pointer" }} />
          <Typography sx={{ color: "#888", fontSize: 12 }}>
            Last synced: 07:32 PM
          </Typography>
          <IconButton size="small">
            <DownloadIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton size="small">
            <OpenInFullIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Content: Count | Donut Chart | Legend */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          minHeight: 250,
        }}
      >
        {/* Left - Total Count */}
        <Box sx={{ width: 60, flexShrink: 0 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 400 }}>
            {total}
          </Typography>
        </Box>

        {/* Center - Donut Chart */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <Box sx={{ width: 240, height: 240, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((_entry, index) => (
                    <Cell key={index} fill="#ED7D31" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label inside donut */}
            <Typography
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              {total}
            </Typography>
          </Box>
        </Box>

        {/* Right - Legend */}
        <Box sx={{ width: 200, flexShrink: 0 }}>
          {data.map((entry, index) => (
            <Box
              key={index}
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: "#ED7D31",
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: 13 }}>
                {entry.name}: {entry.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}