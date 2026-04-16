import React from "react";
import { Fab } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import "./Remarketing.css";

const Remarketing = () => {
  return (
    <div className="fb-container">
      
      {/* Header */}
      <div className="fb-header">
        <div className="fb-tab">Facebook Audiences</div>
      </div>

      

      {/* Content Area */}
      <div className="fb-content">
        {/* Empty for now */}
      </div>

      {/* Floating Button */}
      <Fab className="fb-fab">
        <MyLocationIcon />
      </Fab>

    </div>
  );
};

export default Remarketing;