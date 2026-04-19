import {
  Box,
  Typography,
  Card,
  CardActionArea,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PublicIcon from "@mui/icons-material/Public";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import "./AdvancedSettings.css";

const sections = [
  {
    icon: <PublicIcon sx={{ fontSize: 20, color: "#7b6b3a" }} />,
    title: "Dropdown Values",
    items: [
      { label: "Setup Dropdown Values" },
    ],
  },
  {
    icon: <PeopleAltOutlinedIcon sx={{ fontSize: 20, color: "#555" }} />,
    title: "Users & Roles",
    items: [
      { label: "User Profiles" },
    ],
  },
  {
    icon: <ChatOutlinedIcon sx={{ fontSize: 20, color: "#555" }} />,
    title: "Communications",
    items: [
      { label: "Template Settings" },
    ],
  },
  {
    icon: <AutorenewIcon sx={{ fontSize: 20, color: "#555" }} />,
    title: "Subscription Manager",
    items: [
      {
        label: "Manage your subscriptions",
        description: "View and manage your WhatsApp credit usage",
      },
    ],
  },
];

const AdvancedSettings = () => {
  return (
    <Box className="advanced-settings-container">
      <Typography className="advanced-settings-title">Settings</Typography>
      <Box className="advanced-settings-divider" />

      {sections.map((section, idx) => (
        <Box key={idx} className="advanced-settings-section">
          <Box className="advanced-settings-section-header">
            {section.icon}
            <Typography className="advanced-settings-section-title">
              {section.title}
            </Typography>
          </Box>

          {section.items.map((item, itemIdx) => (
            <Card key={itemIdx} className="advanced-settings-card" variant="outlined">
              <CardActionArea className="advanced-settings-card-action">
                <Box className="advanced-settings-card-content">
                  <Box>
                    <Typography className="advanced-settings-card-label">
                      {item.label}
                    </Typography>
                    {item.description && (
                      <Typography className="advanced-settings-card-description">
                        {item.description}
                      </Typography>
                    )}
                  </Box>
                  <ChevronRightIcon className="advanced-settings-chevron" />
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default AdvancedSettings;
