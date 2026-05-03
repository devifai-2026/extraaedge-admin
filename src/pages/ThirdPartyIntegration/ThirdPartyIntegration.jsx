import React, { useState } from "react";
import "./ThirdPartyIntegration.css";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

const ThirdPartyIntegration = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [integrations] = useState([]);

  const totalCount = integrations.length;
  const publishedCount = integrations.filter((i) => i.published).length;
  const unpublishedCount = integrations.filter((i) => !i.published).length;

  return (
    <div className="tpi-container">
      {/* Page Title */}
      <h2 className="tpi-title">Third Party integrations</h2>
      <div className="tpi-divider" />

      {/* Stats Cards */}
      <div className="tpi-stats-row">
        <div className="tpi-stat-card">
          <span className="tpi-stat-label">Total</span>
          <span className="tpi-stat-value tpi-stat-total">{totalCount}</span>
        </div>
        <div className="tpi-stat-card">
          <span className="tpi-stat-label">Published</span>
          <span className="tpi-stat-value tpi-stat-published">{publishedCount}</span>
        </div>
        <div className="tpi-stat-card">
          <span className="tpi-stat-label">Unpublished</span>
          <span className="tpi-stat-value tpi-stat-unpublished">{unpublishedCount}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tpi-toolbar">
        <div className="tpi-view-toggle">
          <button
            className={`tpi-view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <GridViewIcon fontSize="small" />
          </button>
          <button
            className={`tpi-view-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <ViewListIcon fontSize="small" />
          </button>
        </div>
        <button className="tpi-refresh-btn">
          <RefreshIcon fontSize="small" />
          <span>Refresh</span>
        </button>
        <button className="tpi-add-btn">
          <AddIcon fontSize="small" />
          <span>Add New Integration</span>
        </button>
      </div>

      {/* Empty State */}
      {integrations.length === 0 && (
        <div className="tpi-empty-state">
          <div className="tpi-empty-icon">
            <FolderOpenIcon sx={{ fontSize: 48, color: "#ccc" }} />
          </div>
          <h3 className="tpi-empty-title">No integrations added yet</h3>
          <p className="tpi-empty-subtitle">
            Add your first integration details to get started
          </p>
          <button className="tpi-add-btn tpi-empty-add-btn">
            <AddIcon fontSize="small" />
            <span>Add New Integration</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ThirdPartyIntegration;
