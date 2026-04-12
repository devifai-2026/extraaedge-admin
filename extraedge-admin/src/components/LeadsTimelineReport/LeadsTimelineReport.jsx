import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

const data = [
  { date: "2025-03-31", lead: 75 },
  { date: "2025-04-01", lead: 65 },
  { date: "2025-04-02", lead: 35 },
  { date: "2025-04-03", lead: 37 },
  { date: "2025-04-04", lead: 63 },
  { date: "2025-04-06", lead: 110 },
  { date: "2025-04-07", lead: 68 },
  { date: "2025-04-08", lead: 65 },
  { date: "2025-04-09", lead: 40 },
];
const styles = {
  card: {
    background: "#fff",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid #ddd",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  title: {
    fontWeight: "600",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  icon: {
    fontSize: "18px",
    cursor: "pointer",
    color: "#f97316",
  },
  sync: {
    fontSize: "12px",
    color: "#666",
  },
  legend: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "6px",
    marginTop: "10px",
    fontSize: "12px",
  },
  legendBox: {
    width: "12px",
    height: "12px",
    backgroundColor: "#f97316",
  },
};

const LeadsChart = () => {
  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <span style={styles.title}>
            Leads Timeline Report [MD-118]
          </span>
        </div>

        <div style={styles.actions}>
          <RefreshIcon style={styles.icon} />
          <span style={styles.sync}>Last synced: 05:31 PM</span>
          <DownloadIcon style={styles.icon} />
          <OpenInFullIcon style={styles.icon} />
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid stroke="#e0e0e0" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="lead"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={styles.legend}>
        <span style={styles.legendBox}></span>
        <span>Lead: 556</span>
      </div>
    </div>
  );
};

export default LeadsChart;