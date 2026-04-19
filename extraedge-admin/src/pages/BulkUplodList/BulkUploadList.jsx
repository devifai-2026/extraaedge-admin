import React, { useState } from "react";
import {
  IconButton,
  Select,
  MenuItem,
  InputBase,
  FormControl,
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

const tabs = ["Bulk Upload", "Data Download", "Bulk Status Change", "Bulk Refer"];

// Sample data for each tab
const bulkUploadData = [
  { fileName: "lead-upload 3rd apr_20260413113738.csv", uploadDate: "Apr 13, 2026 5:08 PM", uploadedBy: "Abhijeet Salgar", totalRecords: 60, stage: "Completed" },
  { fileName: "lead-upload-template (3)_20260410052542.csv", uploadDate: "Apr 10, 2026 10:55 AM", uploadedBy: "Abhijeet Salgar", totalRecords: 100, stage: "Completed" },
  { fileName: "lead-upload 3rd apr_20260409053612.csv", uploadDate: "Apr 9, 2026 11:06 AM", uploadedBy: "Abhijeet Salgar", totalRecords: 38, stage: "Completed" },
  { fileName: "lead-upload-template (3)_20260408080846.csv", uploadDate: "Apr 8, 2026 1:39 PM", uploadedBy: "Abhijeet Salgar", totalRecords: 8, stage: "Completed" },
  { fileName: "lead-upload 3rd apr_20260408051830.csv", uploadDate: "Apr 8, 2026 10:49 AM", uploadedBy: "Abhijeet Salgar", totalRecords: 51, stage: "Completed" },
  { fileName: "lead-upload 3rd apr_20260407053101.csv", uploadDate: "Apr 7, 2026 11:01 AM", uploadedBy: "Abhijeet Salgar", totalRecords: 62, stage: "Completed" },
  { fileName: "lead-upload 3rd apr_20260406044941.csv", uploadDate: "Apr 6, 2026 10:20 AM", uploadedBy: "Abhijeet Salgar", totalRecords: 105, stage: "Completed" },
  { fileName: "lead-upload 3rd apr_20260404053922.csv", uploadDate: "Apr 4, 2026 11:10 AM", uploadedBy: "Abhijeet Salgar", totalRecords: 61, stage: "Completed" },
  { fileName: "lead-upload 3rd apr_20260403043017.csv", uploadDate: "Apr 3, 2026 10:00 AM", uploadedBy: "Abhijeet Salgar", totalRecords: 30, stage: "Completed" },
  { fileName: "lead-upload 30th Mar_20260402075859.csv", uploadDate: "Apr 2, 2026 1:29 PM", uploadedBy: "Abhijeet Salgar", totalRecords: 32, stage: "Completed" },
];

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

const Pagination = ({ data, rowsPerPage, setRowsPerPage, currentPage, setCurrentPage }) => {
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const startRow = startIndex + 1;
  const endRow = Math.min(startIndex + rowsPerPage, data.length);

  if (data.length === 0) return null;

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
  const [selectedUser, setSelectedUser] = useState("Abhijeet Salgar");

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

  const users = ["Abhijeet Salgar", "Rahul Sharma", "Priya Patel"];
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
      case 0: return bulkUploadData;
      case 1: return dataDownloadData;
      case 2: return bulkStatusChangeData;
      case 3: return bulkReferData;
      default: return [];
    }
  };

  const tabData = getTabData();
  const startIndex = (getTabCurrentPage - 1) * getTabRowsPerPage;
  const paginatedData = tabData.slice(startIndex, startIndex + getTabRowsPerPage);
  const hasData = tabData.length > 0;

  const renderToolbar = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="bulk-upload-toolbar">
            <IconButton size="small">
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
                    placeholder="Enter File Name"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    sx={{ fontSize: 13, px: 1, flex: 1 }}
                  />
                  <IconButton size="small">
                    <SearchIcon sx={{ fontSize: 18, color: colors.textGrey }} />
                  </IconButton>
                </div>
              </div>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  displayEmpty
                  sx={{
                    fontSize: 13,
                    "& .MuiSelect-select": { padding: "7px 36px 7px 12px" },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.borderGrey },
                  }}
                  endAdornment={
                    selectedUser && (
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedUser(""); }} sx={{ mr: 1 }}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )
                  }
                >
                  {users.map((user) => (
                    <MenuItem key={user} value={user}>{user}</MenuItem>
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
        return (
          <table className="bulk-table">
            <thead>
              <tr>
                <th>FILE NAME</th>
                <th>UPLOAD DATE</th>
                <th>UPLOADED BY</th>
                <th>TOTAL RECORDS</th>
                <th>STAGE</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => (
                <tr key={index}>
                  <td className="file-name-cell">{item.fileName}</td>
                  <td>{item.uploadDate}</td>
                  <td>{item.uploadedBy}</td>
                  <td className="records-cell">{item.totalRecords}</td>
                  <td className="stage-cell">
                    <span className="status-badge status-completed">{item.stage}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

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
      {hasData && (
        <Pagination
          data={tabData}
          rowsPerPage={getTabRowsPerPage}
          setRowsPerPage={setTabRowsPerPage}
          currentPage={getTabCurrentPage}
          setCurrentPage={setTabCurrentPage}
        />
      )}
    </div>
  );
};

export default BulkUploadList;
