import React, { useCallback, useEffect, useState } from "react";
import { IconButton, Button, CircularProgress, Alert } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import ViewListIcon from "@mui/icons-material/ViewList";
import AddIcon from "@mui/icons-material/Add";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import BulkCampaignCard from "../../components/CampaignCard/CampaignCard";
import "./BulkMarketingCampaign.css";
import { colors } from "../../theme/colors";
import SavedList from "../../components/SavedList/SavedList";
import CampaignFilter from "../../components/CampaignFilter/CampaignFilter";
import CreateCampaignModal from "./CreateCampaignModal";
import { campaignsBulkApi, auth } from "../../lib/endpoints";

const ITEMS_PER_PAGE = 8;

// Roles allowed to create / launch / stop / clone campaigns.
const MANAGE_ROLES = ["super_admin", "branch_manager", "sales_manager"];
// Roles allowed to delete campaigns (backend gates delete to these two).
const DELETE_ROLES = ["super_admin", "branch_manager"];

const BulkCampaignContent = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [openListDrawer, setOpenListDrawer] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

  const role = auth.getUser()?.role;
  const canManage = MANAGE_ROLES.includes(role);
  const canDelete = DELETE_ROLES.includes(role);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await campaignsBulkApi.list({ limit: 200 });
      setCampaigns(res?.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load campaigns");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(campaigns.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = campaigns.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const handleRefresh = () => load();

  return (
    <div className="bulk-content-wrapper">

      {/* Top bar */}
      <div className="bulk-top-bar">
        <div className="bulk-tab-active">
          All Bulk Communications ({campaigns.length})
        </div>
        <div className="bulk-top-actions" style={{ alignItems: "center" }}>
          {canManage && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreate(true)}
              sx={{
                textTransform: "none",
                backgroundColor: colors.primary,
                "&:hover": { backgroundColor: colors.primaryDark },
                mr: 1,
              }}
            >
              New Campaign
            </Button>
          )}
          <IconButton size="small" onClick={handleRefresh}>
            <RefreshIcon sx={{ color: colors.primary }} />
          </IconButton>
          <IconButton size="small" onClick={() => setOpenListDrawer(true)}>
            <ViewListIcon sx={{ color: colors.primary }} />
          </IconButton>
          <IconButton size="small" onClick={() => setOpenFilter(true)}>
            <FilterListIcon sx={{ color: colors.primary }} />
          </IconButton>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <CircularProgress sx={{ color: colors.primary }} />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={load}>
              Retry
            </Button>
          }
          sx={{ my: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Empty state */}
      {!loading && !error && campaigns.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0", color: colors.textSecondary }}>
          <CampaignOutlinedIcon sx={{ fontSize: 56, color: colors.borderGrey, mb: 1 }} />
          <p style={{ fontSize: 16, margin: "0 0 4px" }}>No bulk campaigns yet</p>
          <p style={{ fontSize: 13, margin: 0 }}>
            {canManage
              ? "Create your first campaign to start reaching your leads."
              : "Campaigns created by your team will appear here."}
          </p>
        </div>
      )}

      {/* Cards */}
      {!loading && !error && paginatedData.map((item) => (
        <BulkCampaignCard
          key={item.id}
          item={item}
          onChanged={load}
          canManage={canManage}
          canDelete={canDelete}
        />
      ))}

      {/* Pagination */}
      {!loading && !error && campaigns.length > ITEMS_PER_PAGE && (
        <div className="bulk-pagination">
          <span
            className="bulk-page-arrow"
            onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
          >
            {"<"}
          </span>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <span
              key={page}
              className={`bulk-page-num ${safePage === page ? "active" : ""}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </span>
          ))}
          <span
            className="bulk-page-arrow"
            onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
          >
            {">"}
          </span>
        </div>
      )}

      <SavedList
        open={openListDrawer}
        onClose={() => setOpenListDrawer(false)}
      />
      <CampaignFilter
        open={openFilter}
        onClose={() => setOpenFilter(false)}
      />
      <CreateCampaignModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={load}
      />

    </div>
  );
};

export default BulkCampaignContent;
