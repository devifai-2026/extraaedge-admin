import React, { useEffect, useState } from "react";
import {
  IconButton,
  Select,
  MenuItem,
  InputBase,
  FormControl,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import "./BulkUploadList.css";
import noLeadsImg from "../../assets/no-leads.svg";
import { colors } from "../../theme/colors";
import { bulkApi } from "../../lib/endpoints";

const tabs = ["Bulk Upload", "Data Download", "Bulk Status Change", "Bulk Refer"];

// Format an ISO timestamp the same way the rest of the admin shows dates.
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
};

// Capitalize the bulk_imports.status enum value for display ("completed" → "Completed").
const fmtStatus = (s) => {
  if (!s) return "—";
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
};

const dataDownloadData = [
  { downloadedBy: "Abhijeet Salgar", personInCcBcc: "Abhijeet Salgar", downloadedFrom: "Leads", downloadDate: "Apr 8, 2026 1:24 PM", totalRecords: 28368, stage: "Completed" },
  { downloadedBy: "Abhijeet Salgar", personInCcBcc: "Abhijeet Salgar", downloadedFrom: "Leads", downloadDate: "Apr 8, 2026 1:24 PM", totalRecords: 179, stage: "Completed" },
  { downloadedBy: "ExtraaEdge Admin", personInCcBcc: "ExtraaEdge Admin", downloadedFrom: "Leads", downloadDate: "Apr 6, 2026 3:44 PM", totalRecords: 1, stage: "Completed" },
  { downloadedBy: "ExtraaEdge Admin", personInCcBcc: "ExtraaEdge Admin", downloadedFrom: "Leads", downloadDate: "Apr 6, 2026 3:39 PM", totalRecords: 1, stage: "Completed" },
  { downloadedBy: "Abhijeet Salgar", personInCcBcc: "Abhijeet Salgar", downloadedFrom: "Leads", downloadDate: "Apr 6, 2026 12:35 PM", totalRecords: 28240, stage: "Completed" },
  { downloadedBy: "Abhijeet Salgar", personInCcBcc: "Abhijeet Salgar", downloadedFrom: "Leads", downloadDate: "Mar 2, 2026 5:10 PM", totalRecords: 26928, stage: "Completed" },
  { downloadedBy: "Abhijeet Salgar", personInCcBcc: "Abhijeet Salgar", downloadedFrom: "Leads", downloadDate: "Mar 2, 2026 4:54 PM", totalRecords: 26928, stage: "Completed" },
  { downloadedBy: "Abhijeet Salgar", personInCcBcc: "Abhijeet Salgar", downloadedFrom: "Leads", downloadDate: "Mar 2, 2026 2:54 PM", totalRecords: 20867, stage: "Completed" },
  { downloadedBy: "Akansha Kondalwade", personInCcBcc: "Abhijeet Salgar,Akansha Kondalwade", downloadedFrom: "Leads", downloadDate: "Feb 11, 2026 3:41 PM", totalRecords: 7973, stage: "Completed" },
];

const bulkStatusChangeData = [
  { createdBy: "Abhijeet Salgar", createdDate: "Oct 11, 2025 2:06 PM", totalRecords: 3530, actionStatus: "Completed" },
];

const bulkReferData = [
  { createdBy: "Divya Nair", createdDate: "Apr 16, 2026 10:26 AM", totalRecords: 27, actionStatus: "Completed" },
  { createdBy: "Abhijeet Salgar", createdDate: "Apr 16, 2026 10:24 AM", totalRecords: 5, actionStatus: "Completed" },
  { createdBy: "Abhijeet Salgar", createdDate: "Apr 9, 2026 11:29 AM", totalRecords: 0, actionStatus: "Failed" },
  { createdBy: "Abhijeet Salgar", createdDate: "Apr 9, 2026 11:28 AM", totalRecords: 6, actionStatus: "Completed" },
  { createdBy: "Abhijeet Salgar", createdDate: "Apr 9, 2026 11:28 AM", totalRecords: 55, actionStatus: "Completed" },
  { createdBy: "Abhijeet Salgar", createdDate: "Apr 9, 2026 11:26 AM", totalRecords: 33, actionStatus: "Completed" },
  { createdBy: "Abhijeet Salgar", createdDate: "Apr 9, 2026 11:25 AM", totalRecords: 34, actionStatus: "Completed" },
  { createdBy: "Abhijeet Salgar", createdDate: "Apr 9, 2026 11:24 AM", totalRecords: 34, actionStatus: "Completed" },
  { createdBy: "Abhijeet Salgar", createdDate: "Apr 9, 2026 11:24 AM", totalRecords: 34, actionStatus: "Completed" },
  { createdBy: "Abhijeet Salgar", createdDate: "Apr 7, 2026 10:46 AM", totalRecords: 1, actionStatus: "Completed" },
  { createdBy: "Abhijeet Salgar", createdDate: "Apr 5, 2026 9:30 AM", totalRecords: 12, actionStatus: "Completed" },
];

const Pagination = ({ data, rowsPerPage, setRowsPerPage, currentPage, setCurrentPage, totalCount }) => {
  // For server-paginated tabs the caller passes totalCount; for the legacy
  // client-paginated tabs we still derive it from the in-memory array.
  const total = typeof totalCount === "number" ? totalCount : data.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const startRow = total === 0 ? 0 : startIndex + 1;
  const endRow = Math.min(startIndex + rowsPerPage, total);

  if (total === 0) return null;

  return (
    <div className="bulk-pagination">
      <div className="pagination-rows">
        <span>Rows per page</span>
        <FormControl size="small">
          <Select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(e.target.value);
              setCurrentPage(1);
            }}
            sx={{
              fontSize: 13,
              ml: 1,
              "& .MuiSelect-select": { padding: "4px 28px 4px 8px" },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.borderGrey },
            }}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
          </Select>
        </FormControl>
      </div>
      <div className="pagination-nav">
        <button
          className="pagination-btn"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
          Previous
        </button>
        <span className="pagination-info">
          {startRow} to {endRow}
        </span>
        <button
          className="pagination-btn pagination-btn-bold"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Next
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
};

const BulkUploadList = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchType, setSearchType] = useState("fileName");
  const [searchValue, setSearchValue] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  // Per-tab pagination state
  const [rowsPerPage, setRowsPerPage] = useState({ 0: 10, 1: 10, 2: 10, 3: 10 });
  const [currentPage, setCurrentPage] = useState({ 0: 1, 1: 1, 2: 1, 3: 1 });

  // Data Download filters
  const [downloadCounselor, setDownloadCounselor] = useState("");
  const [downloadDateRange] = useState("Jan 16, 2026 - Apr 16, 2026");

  // Bulk Status Change / Bulk Refer filters
  const [statusDateType, setStatusDateType] = useState("Created Date");
  const [statusCounselor, setStatusCounselor] = useState("");
  const [referDateType, setReferDateType] = useState("Created Date");
  const [referCounselor, setReferCounselor] = useState("");

  // ---------- Tab 0 (Bulk Upload) — real API state ----------
  // Server scopes by role: super_admin sees all, sales_manager sees own +
  // hierarchy below, counsellor sees only their own. Filters are applied
  // server-side so we don't have to over-fetch.
  const [imports, setImports] = useState([]);
  const [importsTotal, setImportsTotal] = useState(0);
  const [importsLoading, setImportsLoading] = useState(false);
  const [importsError, setImportsError] = useState("");
  const [uploaders, setUploaders] = useState([]);
  // Tracks which row's download is currently in flight so the icon can
  // show a spinner. We don't bother with a queue — single-click flow.
  const [downloadingId, setDownloadingId] = useState(null);

  // Per-row failures modal — shows OWNER_MISMATCH / CURRENT_OWNER_NOT_COUNSELLOR /
  // PREVIOUS_OWNER_NOT_FOUND etc. with the Excel row number that produced them.
  const [failuresModal, setFailuresModal] = useState({ open: false, importId: null, fileName: '', rows: [], loading: false, error: '' });
  const openFailures = async (item) => {
    setFailuresModal({ open: true, importId: item.id, fileName: item.file_name || '—', rows: [], loading: true, error: '' });
    try {
      const r = await bulkApi.importFailures(item.id);
      setFailuresModal((prev) => ({ ...prev, rows: r?.data || [], loading: false }));
    } catch (e) {
      setFailuresModal((prev) => ({ ...prev, loading: false, error: e?.message || 'Could not load failures' }));
    }
  };
  const closeFailures = () => setFailuresModal({ open: false, importId: null, fileName: '', rows: [], loading: false, error: '' });

  const handleDownload = async (item) => {
    if (!item?.id || !item?.file_r2_key) return;
    setDownloadingId(item.id);
    try {
      const r = await bulkApi.importFile(item.id);
      const url = r?.data?.url;
      if (!url) throw new Error("No download URL returned");
      // The signed URL has Content-Disposition baked in by the server, so
      // a same-tab navigation (or window.open) saves the file with the
      // right filename. Use a hidden <a> click so we don't replace the
      // current page on browsers that ignore the disposition header.
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener noreferrer";
      // download attr lets the browser save without navigating, when the
      // signed-URL response sends an attachment disposition.
      a.download = item.file_name
        || (item.file_r2_key ? item.file_r2_key.split("/").pop() : "upload.xlsx");
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert(e?.message || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  // Debounce the file-name input so typing doesn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchValue.trim()), 350);
    return () => clearTimeout(id);
  }, [searchValue]);

  // Reset to page 1 whenever any filter changes.
  useEffect(() => {
    setCurrentPage((prev) => ({ ...prev, 0: 1 }));
  }, [debouncedSearch, selectedUserId, searchType]);

  // Load uploaders once when the component mounts so the dropdown is
  // populated. The server already restricts this list to people the
  // viewer is allowed to filter by.
  useEffect(() => {
    let alive = true;
    bulkApi.importsUploaders()
      .then((r) => { if (alive) setUploaders(r?.data || []); })
      .catch(() => { if (alive) setUploaders([]); });
    return () => { alive = false; };
  }, []);

  // A tick counter that bumps when the user clicks Refresh — drives the
  // effect below to re-fetch even when the filter inputs haven't changed.
  const [reloadTick, setReloadTick] = useState(0);
  const reloadImports = () => setReloadTick((n) => n + 1);

  // Fetch the page whenever any of the filter / pagination dependencies
  // change, or when the user clicks Refresh.
  useEffect(() => {
    if (activeTab !== 0) return undefined;
    let alive = true;
    setImportsLoading(true);
    setImportsError("");
    const params = { page: currentPage[0], limit: rowsPerPage[0] };
    if (searchType === "fileName" && debouncedSearch) params.file_name = debouncedSearch;
    if (selectedUserId) params.user_id = selectedUserId;
    bulkApi.imports(params)
      .then((r) => {
        if (!alive) return;
        setImports(r?.data || []);
        setImportsTotal(r?.meta?.total ?? (r?.data?.length || 0));
      })
      .catch((e) => {
        if (!alive) return;
        setImportsError(e?.message || "Failed to load uploads");
        setImports([]);
        setImportsTotal(0);
      })
      .finally(() => { if (alive) setImportsLoading(false); });
    return () => { alive = false; };
  }, [activeTab, currentPage, rowsPerPage, debouncedSearch, selectedUserId, searchType, reloadTick]);

  const counselors = ["Abhijeet Salgar", "Divya Nair", "ExtraaEdge Admin", "Akansha Kondalwade"];

  const getTabRowsPerPage = rowsPerPage[activeTab];
  const getTabCurrentPage = currentPage[activeTab];

  const setTabRowsPerPage = (val) => setRowsPerPage((prev) => ({ ...prev, [activeTab]: val }));
  const setTabCurrentPage = (val) => {
    if (typeof val === "function") {
      setCurrentPage((prev) => ({ ...prev, [activeTab]: val(prev[activeTab]) }));
    } else {
      setCurrentPage((prev) => ({ ...prev, [activeTab]: val }));
    }
  };

  const getTabData = () => {
    switch (activeTab) {
      // Tab 0 is server-paginated; the rows we already fetched ARE the page.
      case 0: return imports;
      case 1: return dataDownloadData;
      case 2: return bulkStatusChangeData;
      case 3: return bulkReferData;
      default: return [];
    }
  };

  const tabData = getTabData();
  // Tabs 1..3 still paginate client-side (they're hardcoded mock data).
  // Tab 0 is server-paginated, so the rows we received ARE already the page.
  const startIndex = (getTabCurrentPage - 1) * getTabRowsPerPage;
  const paginatedData = activeTab === 0
    ? tabData
    : tabData.slice(startIndex, startIndex + getTabRowsPerPage);
  const hasData = tabData.length > 0;

  const renderToolbar = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="bulk-upload-toolbar">
            <IconButton size="small" onClick={reloadImports} disabled={importsLoading} title="Refresh">
              <RefreshIcon sx={{ color: colors.primary, fontSize: 22 }} />
            </IconButton>
            <div className="toolbar-right">
              <div className="search-group">
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <Select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    sx={{
                      fontSize: 13,
                      borderRadius: "4px 0 0 4px",
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.borderGrey, borderRight: "none" },
                      "& .MuiSelect-select": { padding: "7px 12px" },
                    }}
                  >
                    <MenuItem value="fileName">File Name</MenuItem>
                    <MenuItem value="uploadedBy">Uploaded By</MenuItem>
                  </Select>
                </FormControl>
                <div className="search-input-wrapper">
                  <InputBase
                    placeholder={searchType === "fileName" ? "Enter File Name" : "Use Uploaded By dropdown →"}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    disabled={searchType !== "fileName"}
                    sx={{ fontSize: 13, px: 1, flex: 1 }}
                  />
                  {searchValue && (
                    <IconButton size="small" onClick={() => setSearchValue("")} title="Clear">
                      <CloseIcon sx={{ fontSize: 16, color: colors.textGrey }} />
                    </IconButton>
                  )}
                  <IconButton size="small">
                    <SearchIcon sx={{ fontSize: 18, color: colors.textGrey }} />
                  </IconButton>
                </div>
              </div>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  displayEmpty
                  renderValue={(val) => {
                    if (!val) return <span style={{ color: colors.midGrey }}>All Uploaders</span>;
                    const u = uploaders.find((x) => x.id === val);
                    return u?.name || u?.email || val;
                  }}
                  sx={{
                    fontSize: 13,
                    "& .MuiSelect-select": { padding: "7px 36px 7px 12px" },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.borderGrey },
                  }}
                  endAdornment={
                    selectedUserId && (
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedUserId(""); }} sx={{ mr: 1 }}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )
                  }
                >
                  <MenuItem value=""><em>All Uploaders</em></MenuItem>
                  {uploaders.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name || u.email}
                      {u.role && <span style={{ color: colors.midGrey, fontSize: 11, marginLeft: 6 }}>· {String(u.role).replace(/_/g, " ")}</span>}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="bulk-upload-toolbar">
            <IconButton size="small">
              <RefreshIcon sx={{ color: colors.primary, fontSize: 22 }} />
            </IconButton>
            <div className="toolbar-right">
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <Select
                  value={downloadCounselor}
                  onChange={(e) => setDownloadCounselor(e.target.value)}
                  displayEmpty
                  renderValue={(val) => val || "Select Counselor Name"}
                  sx={{
                    fontSize: 13,
                    "& .MuiSelect-select": { padding: "7px 36px 7px 12px" },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.borderGrey },
                  }}
                  endAdornment={
                    downloadCounselor && (
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDownloadCounselor(""); }} sx={{ mr: 1 }}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )
                  }
                >
                  {counselors.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <div className="date-range-display">
                <span>{downloadDateRange}</span>
                <IconButton size="small">
                  <CalendarTodayIcon sx={{ fontSize: 16, color: colors.textGrey }} />
                </IconButton>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="bulk-upload-toolbar">
            <IconButton size="small">
              <RefreshIcon sx={{ color: colors.primary, fontSize: 22 }} />
            </IconButton>
            <div className="toolbar-right">
              <div className="date-filter-group">
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={statusDateType}
                    onChange={(e) => setStatusDateType(e.target.value)}
                    sx={{
                      fontSize: 13,
                      borderRadius: "4px 0 0 4px",
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.borderGrey, borderRight: "none" },
                      "& .MuiSelect-select": { padding: "7px 12px" },
                    }}
                  >
                    <MenuItem value="Created Date">Created Date</MenuItem>
                    <MenuItem value="Updated Date">Updated Date</MenuItem>
                  </Select>
                </FormControl>
                <div className="date-input-wrapper">
                  <span className="date-placeholder">Please Select Created Date</span>
                  <IconButton size="small">
                    <CalendarTodayIcon sx={{ fontSize: 16, color: colors.textGrey }} />
                  </IconButton>
                </div>
              </div>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={statusCounselor}
                  onChange={(e) => setStatusCounselor(e.target.value)}
                  displayEmpty
                  renderValue={(val) => val || "All Counselors"}
                  sx={{
                    fontSize: 13,
                    "& .MuiSelect-select": { padding: "7px 36px 7px 12px" },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.borderGrey },
                  }}
                  endAdornment={
                    statusCounselor && (
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setStatusCounselor(""); }} sx={{ mr: 1 }}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )
                  }
                >
                  {counselors.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="bulk-upload-toolbar">
            <IconButton size="small">
              <RefreshIcon sx={{ color: colors.primary, fontSize: 22 }} />
            </IconButton>
            <div className="toolbar-right">
              <div className="date-filter-group">
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={referDateType}
                    onChange={(e) => setReferDateType(e.target.value)}
                    sx={{
                      fontSize: 13,
                      borderRadius: "4px 0 0 4px",
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.borderGrey, borderRight: "none" },
                      "& .MuiSelect-select": { padding: "7px 12px" },
                    }}
                  >
                    <MenuItem value="Created Date">Created Date</MenuItem>
                    <MenuItem value="Updated Date">Updated Date</MenuItem>
                  </Select>
                </FormControl>
                <div className="date-input-wrapper">
                  <span className="date-placeholder">Please Select Created Date</span>
                  <IconButton size="small">
                    <CalendarTodayIcon sx={{ fontSize: 16, color: colors.textGrey }} />
                  </IconButton>
                </div>
              </div>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={referCounselor}
                  onChange={(e) => setReferCounselor(e.target.value)}
                  displayEmpty
                  renderValue={(val) => val || "All Counselors"}
                  sx={{
                    fontSize: 13,
                    "& .MuiSelect-select": { padding: "7px 36px 7px 12px" },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.borderGrey },
                  }}
                  endAdornment={
                    referCounselor && (
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setReferCounselor(""); }} sx={{ mr: 1 }}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )
                  }
                >
                  {counselors.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderTable = () => {
    // Tab 0 has its own loading/error states because it pulls from the API.
    if (activeTab === 0) {
      if (importsLoading) {
        return (
          <div className="empty-state" style={{ padding: 64 }}>
            <CircularProgress size={28} />
          </div>
        );
      }
      if (importsError) {
        return (
          <div className="empty-state">
            <h3 style={{ color: "#c62828" }}>{importsError}</h3>
          </div>
        );
      }
      if (!hasData) {
        return (
          <div className="empty-state">
            <img src={noLeadsImg} alt="No data" />
            <h3>No bulk uploads yet</h3>
          </div>
        );
      }
      return (
        <table className="bulk-table">
          <thead>
            <tr>
              <th>FILE NAME</th>
              <th>UPLOAD DATE</th>
              <th>UPLOADED BY</th>
              <th>TOTAL</th>
              <th>SUCCESS</th>
              <th>FAILED</th>
              <th>DUPLICATES</th>
              <th>STAGE</th>
              <th style={{ textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item) => {
              // file_name is the user-supplied filename (set by UploadLeads
              // on commit). Fall back to the basename of the storage key
              // for older rows imported before file_name existed.
              const fileLabel = item.file_name
                || (item.file_r2_key ? item.file_r2_key.split("/").pop() : "—");
              const canDownload = !!item.file_r2_key;
              return (
                <tr key={item.id}>
                  <td className="file-name-cell" title={item.file_r2_key}>{fileLabel}</td>
                  <td>{fmtDate(item.created_at)}</td>
                  <td>
                    {item.uploaded_by_name || item.uploaded_by_email || "—"}
                    {item.uploaded_by_role && (
                      <span style={{ color: colors.midGrey, fontSize: 11, marginLeft: 6 }}>
                        · {String(item.uploaded_by_role).replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                  <td className="records-cell">{item.total_rows ?? 0}</td>
                  <td className="records-cell">{item.success_rows ?? 0}</td>
                  <td className="records-cell" style={{ color: (item.failed_rows ?? 0) > 0 ? '#c62828' : undefined }}>
                    {item.failed_rows ?? 0}
                  </td>
                  <td className="records-cell">{item.duplicate_rows ?? 0}</td>
                  <td className="stage-cell">
                    <span className={`status-badge ${
                      item.status === "completed" ? "status-completed"
                        : item.status === "failed" ? "status-failed"
                        : ""
                    }`}>
                      {fmtStatus(item.status)}
                    </span>
                  </td>
                  <td className="actions-cell" style={{ textAlign: "right" }}>
                    {(item.failed_rows ?? 0) > 0 && (
                      <Tooltip title={`View ${item.failed_rows} failed row${item.failed_rows === 1 ? '' : 's'}`}>
                        <IconButton size="small" onClick={() => openFailures(item)}>
                          <VisibilityOutlinedIcon sx={{ fontSize: 18, color: '#c62828' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title={canDownload ? "Download original file" : "Original file unavailable"}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={!canDownload || downloadingId === item.id}
                          onClick={() => handleDownload(item)}
                        >
                          {downloadingId === item.id
                            ? <CircularProgress size={16} />
                            : <FileDownloadOutlinedIcon sx={{ fontSize: 18, color: canDownload ? colors.primary : colors.midGrey }} />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (!hasData) {
      return (
        <div className="empty-state">
          <img src={noLeadsImg} alt="No data" />
          <h3>No data added yet</h3>
        </div>
      );
    }

    switch (activeTab) {
      case 0:
        // (handled above)
        return null;

      case 1:
        return (
          <table className="bulk-table">
            <thead>
              <tr>
                <th>DOWNLOADED BY</th>
                <th>PERSON IN CC/BCC</th>
                <th>DOWNLOADED FROM</th>
                <th>DOWNLOAD DATE</th>
                <th>TOTAL RECO...</th>
                <th>DOWNLOAD STAGE</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => (
                <tr key={index}>
                  <td>{item.downloadedBy}</td>
                  <td>{item.personInCcBcc}</td>
                  <td>{item.downloadedFrom}</td>
                  <td>{item.downloadDate}</td>
                  <td className="records-cell">{item.totalRecords}</td>
                  <td className="stage-cell">
                    <span className="status-badge status-completed">{item.stage}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 2:
        return (
          <table className="bulk-table">
            <thead>
              <tr>
                <th>CREATED BY</th>
                <th>CREATED DATE</th>
                <th>TOTAL RECORDS</th>
                <th>ACTION STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => (
                <tr key={index}>
                  <td>{item.createdBy}</td>
                  <td>{item.createdDate}</td>
                  <td>{item.totalRecords}</td>
                  <td>
                    <span className={`status-badge ${item.actionStatus === "Completed" ? "status-completed" : "status-failed"}`}>
                      {item.actionStatus}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <IconButton size="small">
                      <VisibilityOutlinedIcon sx={{ fontSize: 18, color: colors.primary }} />
                    </IconButton>
                    <IconButton size="small">
                      <FileDownloadOutlinedIcon sx={{ fontSize: 18, color: colors.primary }} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 3:
        return (
          <table className="bulk-table">
            <thead>
              <tr>
                <th>CREATED BY</th>
                <th>CREATED DATE</th>
                <th>TOTAL RECORDS</th>
                <th>ACTION STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => (
                <tr key={index}>
                  <td>{item.createdBy}</td>
                  <td>{item.createdDate}</td>
                  <td>{item.totalRecords}</td>
                  <td>
                    <span className={`status-badge ${item.actionStatus === "Completed" ? "status-completed" : "status-failed"}`}>
                      {item.actionStatus}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <IconButton size="small">
                      <VisibilityOutlinedIcon sx={{ fontSize: 18, color: colors.primary }} />
                    </IconButton>
                    <IconButton size="small">
                      <FileDownloadOutlinedIcon sx={{ fontSize: 18, color: colors.primary }} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bulk-upload-container">
      {/* Tabs */}
      <div className="bulk-upload-tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            className={`bulk-tab ${activeTab === index ? "bulk-tab-active" : ""}`}
            onClick={() => setActiveTab(index)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      {renderToolbar()}

      {/* Content */}
      <div className="bulk-upload-content">
        {renderTable()}
      </div>

      {/* Pagination */}
      {(activeTab === 0 ? importsTotal > 0 : hasData) && (
        <Pagination
          data={tabData}
          rowsPerPage={getTabRowsPerPage}
          setRowsPerPage={setTabRowsPerPage}
          currentPage={getTabCurrentPage}
          setCurrentPage={setTabCurrentPage}
          totalCount={activeTab === 0 ? importsTotal : undefined}
        />
      )}

      {/* Per-row failures dialog. Lists every row the worker rejected with the
          Excel row number, error code (e.g. OWNER_MISMATCH) and message. */}
      <Dialog open={failuresModal.open} onClose={closeFailures} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>
          Failed rows — {failuresModal.fileName}
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '60vh' }}>
          {failuresModal.loading && (
            <div style={{ padding: 24, textAlign: 'center' }}><CircularProgress size={24} /></div>
          )}
          {!failuresModal.loading && failuresModal.error && (
            <div style={{ color: '#c62828', fontSize: 13 }}>{failuresModal.error}</div>
          )}
          {!failuresModal.loading && !failuresModal.error && failuresModal.rows.length === 0 && (
            <div style={{ color: colors.midGrey, fontSize: 13 }}>No failed rows recorded for this import.</div>
          )}
          {!failuresModal.loading && !failuresModal.error && failuresModal.rows.length > 0 && (
            <table className="bulk-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>ROW</th>
                  <th style={{ width: 220 }}>ERROR CODE</th>
                  <th>MESSAGE</th>
                </tr>
              </thead>
              <tbody>
                {failuresModal.rows.map((f) => (
                  <tr key={f.id}>
                    <td className="records-cell">{f.row_number}</td>
                    <td>
                      <Chip
                        size="small"
                        label={f.error_code || 'UNKNOWN'}
                        sx={{
                          fontSize: 11,
                          fontFamily: 'monospace',
                          background: '#fee2e2',
                          color: '#991b1b',
                        }}
                      />
                    </td>
                    <td style={{ fontSize: 13 }}>{f.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFailures}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default BulkUploadList;
