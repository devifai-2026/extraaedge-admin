// AssignmentRules.jsx
import React from "react";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import "./AssignmentRules.css";

const AssignmentRules = () => {
  return (
    <Box className="assignment-container-rules">
      <Box className="top-actions-rules">
        <Button variant="outlined">Filter</Button>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Rule
        </Button>
      </Box>

      <Box className="empty-state-rules">
        <Typography variant="h6">No search result found</Typography>
        <Typography variant="body2">
          We cannot find what you were looking for.
        </Typography>
      </Box>
    </Box>
  );
};

export default AssignmentRules;