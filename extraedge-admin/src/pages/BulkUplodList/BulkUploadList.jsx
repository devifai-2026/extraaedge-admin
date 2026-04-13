import React, { useState } from "react";
import {
  Tabs,
  Tab,
  Box,
  IconButton,
  Select,
  MenuItem,
  InputBase,
  FormControl,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import "./BulkUploadList.css";
import noLeadsImg from "../../assets/no-leads.svg";

const BulkUploadList = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchType, setSearchType] = useState("fileName");
  const [searchValue, setSearchValue] = useState("");
  const [selectedUser, setSelectedUser] = useState("Divya Nair");

  const users = ["Divya Nair", "Rahul Sharma", "Priya Patel"];

  return (
    <div className="bulk-upload-container">
      {/* Tabs */}
      <div className="bulk-upload-tabs">
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          TabIndicatorProps={{ style: { display: "none" } }}
        >
          <Tab
            label="Bulk Upload"
            sx={{
              textTransform: "none",
              minHeight: "36px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "4px",
              marginRight: "6px",
              padding: "6px 16px",
              backgroundColor: activeTab === 0 ? "#ff7800" : "transparent",
              color: activeTab === 0 ? "#fff !important" : "#7d7d7d",
              "&:hover": {
                backgroundColor: activeTab === 0 ? "#ff7800" : "#e0e0e0",
              },
            }}
          />
          <Tab
            label="Data Download"
            sx={{
              textTransform: "none",
              minHeight: "36px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "4px",
              padding: "6px 16px",
              backgroundColor: activeTab === 1 ? "#ff7800" : "transparent",
              color: activeTab === 1 ? "#fff !important" : "#7d7d7d",
              "&:hover": {
                backgroundColor: activeTab === 1 ? "#ff7800" : "#e0e0e0",
              },
            }}
          />
        </Tabs>
      </div>

      {/* Toolbar */}
      <div className="bulk-upload-toolbar">
        <div className="toolbar-left">
          <IconButton size="small">
            <RefreshIcon sx={{ color: "#ff7800" }} />
          </IconButton>
        </div>

        <div className="toolbar-right">
          {/* Search Section */}
          <div className="search-group">
            <FormControl
              size="small"
              sx={{ minWidth: 100 }}
            >
              <Select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                variant="outlined"
                sx={{
                  fontSize: "13px",
                  height: "36px",
                  borderRadius: "4px 0 0 4px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                    borderRight: "none",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#bdbdbd",
                    borderRight: "none",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#ff7800",
                    borderRight: "none",
                    borderWidth: "1px",
                  },
                }}
              >
                <MenuItem value="fileName" sx={{ fontSize: "13px" }}>
                  File Name
                </MenuItem>
                <MenuItem value="uploadedBy" sx={{ fontSize: "13px" }}>
                  Uploaded By
                </MenuItem>
              </Select>
            </FormControl>
            <div className="search-input-wrapper">
              <InputBase
                placeholder="Enter File Name"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                sx={{
                  fontSize: "13px",
                  height: "36px",
                  padding: "0 8px",
                  flex: 1,
                }}
              />
              <IconButton size="small" sx={{ color: "#666" }}>
                <SearchIcon fontSize="small" />
              </IconButton>
            </div>
          </div>

          {/* User Select */}
          <div className="user-select-wrapper">
            <FormControl size="small">
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                variant="outlined"
                endAdornment={
                  selectedUser && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser("");
                      }}
                      sx={{ marginRight: "8px" }}
                    >
                      <CloseIcon sx={{ fontSize: "16px" }} />
                    </IconButton>
                  )
                }
                sx={{
                  fontSize: "13px",
                  height: "36px",
                  minWidth: "160px",
                  borderRadius: "4px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#bdbdbd",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#ff7800",
                    borderWidth: "1px",
                  },
                }}
              >
                {users.map((user) => (
                  <MenuItem key={user} value={user} sx={{ fontSize: "13px" }}>
                    {user}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bulk-upload-content">
        {activeTab === 0 && (
          <div className="empty-state">
            <img
              src={noLeadsImg}
              alt="No bulk uploads"
              className="empty-state-image"
            />
            <h3 className="empty-state-title">No Bulk Uploads added yet</h3>
            <p className="empty-state-subtitle">
              Any new bulk upload will be listed here.
            </p>
          </div>
        )}
        {activeTab === 1 && (
          <div className="empty-state">
            <img
              src={noLeadsImg}
              alt="No data downloads"
              className="empty-state-image"
            />
            <h3 className="empty-state-title">No Data Downloads yet</h3>
            <p className="empty-state-subtitle">
              Any new data download will be listed here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkUploadList;
