import React, { useEffect, useState } from "react";
import { Tabs, Tab } from "@mui/material";
import { dropdownsApi, leadsApi } from "../../lib/endpoints";
import "./TabsSection.css";

// Tabs are dynamic: pulled from /dropdowns/stages, counts from /leads/stage-counts.
// activeStageId === null  => "All"
// activeStageId === "fresh" / "untouched" => virtual flag buckets
const TabsSection = ({ activeStageId, onChange, reloadKey }) => {
  const [stages, setStages] = useState([]);
  const [counts, setCounts] = useState({ all: 0, fresh: 0, untouched: 0, stages: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [stagesRes, countsRes] = await Promise.all([
          dropdownsApi.list('stages'),
          leadsApi.stageCounts(),
        ]);
        if (!alive) return;
        const stagesList = (stagesRes?.data || []).filter((s) => s.is_active !== false);
        setStages(stagesList);
        setCounts(countsRes?.data || { all: 0, fresh: 0, untouched: 0, unassigned: 0, stages: [] });
      } catch (e) {
        if (!alive) return;
        setStages([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [reloadKey]);

  const countFor = (id) => counts.stages.find((s) => s.stage_id === id)?.count ?? 0;

  // Tab values: 'all' | 'fresh' | 'untouched' | <stage_uuid>
  const value = activeStageId ?? 'all';
  const handleChange = (_e, val) => {
    if (val === 'all') onChange?.(null);
    else onChange?.(val);
  };

  return (
    <div className="lead-list-tabs">
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        TabIndicatorProps={{ style: { display: "none" } }}
      >
        <Tab value="all" label={`All (${counts.all})`} className={`custom-tab ${value === 'all' ? "active" : ""}`} />
        <Tab value="unassigned" label={`Unassigned (${counts.unassigned ?? 0})`} className={`custom-tab ${value === 'unassigned' ? "active" : ""}`} />
        <Tab value="fresh" label={`Fresh (${counts.fresh})`} className={`custom-tab ${value === 'fresh' ? "active" : ""}`} />
        <Tab value="untouched" label={`Untouched (${counts.untouched})`} className={`custom-tab ${value === 'untouched' ? "active" : ""}`} />
        {stages.map((s) => (
          <Tab
            key={s.id}
            value={s.id}
            label={`${s.name} (${countFor(s.id)})`}
            className={`custom-tab ${value === s.id ? "active" : ""}`}
          />
        ))}
        {loading && <Tab disabled label="Loading…" />}
      </Tabs>

      <div className="lead-card-divider"></div>
    </div>
  );
};

export default TabsSection;
