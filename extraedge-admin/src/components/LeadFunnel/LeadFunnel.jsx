import React from "react";
import {
    FunnelChart,
    Funnel,
    Tooltip,
    LabelList,
    ResponsiveContainer,
} from "recharts";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

const data = [
    { name: "New", value: 6, fill: "#f47c2c" },
    { name: "Cold", value: 4, fill: "#e6d85c" },
    { name: "Visited", value: 1, fill: "#63b7a6" },
];

const styles = {
    card: {
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "16px",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "10px",
    },
    title: {
        fontWeight: "600",
    },
    sync: {
        fontSize: "12px",
        color: "#666",
    },
    total: {
        margin: "10px 0",
    },
    legend: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        marginTop: "16px",
    },
    legendItem: {
        fontSize: "12px",
    },
    box: {
        width: "10px",
        height: "10px",
        display: "inline-block",
        marginRight: "6px",
    },
    icon: {
        cursor: "pointer",
        fontSize: "18px",
    },
};

const LeadFunnel = () => {
    return (
        <div style={styles.card}>
            {/* Header */}
            <div style={styles.header}>
                <span style={styles.title}>Lead Funnel [MD-110]</span>
                <div style={{display: "flex", alignItems: "center", gap:"10px", padding: "8px"}}>
                    <RefreshIcon style={styles.icon} />
                    <span style={styles.sync}>Last synced: 05:31 PM</span>
                    <DownloadIcon style={styles.icon} />
                    <OpenInFullIcon style={styles.icon} />
                </div>

            </div>
            {/* Funnel */}
            <ResponsiveContainer width="100%" height={300}>
                <FunnelChart>
                    <Tooltip />
                    <Funnel dataKey="value" data={data} isAnimationActive>
                        <LabelList position="center" fill="#000" stroke="none" />
                    </Funnel>
                </FunnelChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={styles.legend}>
                {data.map((item, i) => (
                    <div key={i} style={styles.legendItem}>
                        <span
                            style={{ ...styles.box, backgroundColor: item.fill }}
                        ></span>
                        {item.name}: {item.value}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LeadFunnel;