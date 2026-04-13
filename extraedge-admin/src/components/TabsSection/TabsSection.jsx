import React, { useState } from "react";
import { Tabs, Tab } from "@mui/material";
import "./TabsSection.css";

const tabData = [
  { label: "All", count: 1359 },
  { label: "New", count: 6 },
  { label: "Ringing / Not Reachable", count: 0 },
  { label: "Followup", count: 108 },
  { label: "Demo Scheduled", count: 1 },
  { label: "Engaged Leads", count: 27 },
  { label: "Prospect", count: 1 },
  { label: "Demo Attended", count: 1 },
  { label: "Scheduled Visit", count: 0 },
  { label: "Visited", count: 5 },
  { label: "Enrolled", count: 59 },
  { label: "Junk", count: 163 },
  { label: "Cold", count: 988 },
  { label: "Re-enquired", count: 1 },
];

const TabsSection = () => {
  const [value, setValue] = useState(0);

  return (
    <div className="lead-list-tabs">
      <Tabs
        value={value}
        onChange={(e, newValue) => setValue(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        TabIndicatorProps={{ style: { display: "none" } }}
      >
        {tabData.map((tab, index) => (
          <Tab
            key={index}
            label={`${tab.label} (${tab.count})`}
            className={`custom-tab ${value === index ? "active" : ""}`}
          />
        ))}
      </Tabs>

      <div className="lead-card-divider"></div>
    </div>
  );
};

export default TabsSection;