// TemplatesPage.jsx
import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { colors } from "../../theme/colors";

import EmailTemplates from "../../components/EmailTemplates/EmailTemplates";
import SMSTemplates from "../../components/SMSTemplates/SMSTemplates";
import LeadScore from "../../components/LeadScore/LeadScore";
import AssignmentRules from "../../components/AssignmentRules/AssignmentRules";
import "./Settings.css";

const Settings = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box className="page-container-Settings">
      {/* Tabs */}
      <Box className="tabs-header-settings">
        <Tabs
          value={tab}
          onChange={(e, val) => setTab(val)}
          TabIndicatorProps={{ style: { display: "none" } }}
        >
          {["Email Templates", "SMS Templates", "Lead Score", "Assignment Rules"].map(
            (t, i) => (
              <Tab
                key={i}
                label={t}
                className={tab === i ? "active-tab-settings" : "tab-settings"}
                sx={
                  tab === i
                    ? { backgroundColor: colors.primary, color: colors.white }
                    : { color: colors.darkGrey }
                }
              />
            )
          )}
        </Tabs>
      </Box>

      {/* Search - only for Email and SMS tabs */}
      {(tab === 0 || tab === 1) && (
        <Box className="search-row-settings">
          <TextField
            size="small"
            placeholder="Enter Template Name"
            className="search-box-settings"
            sx={{ background: colors.white }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
        </Box>
      )}

      {/* Content */}
      {tab === 0 && <EmailTemplates />}
      {tab === 1 && <SMSTemplates />}
      {tab === 2 && <LeadScore />}
      {tab === 3 && <AssignmentRules />}
    </Box>
  );
};

export default Settings;
