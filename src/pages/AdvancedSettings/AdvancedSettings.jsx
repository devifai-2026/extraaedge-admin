// Settings hub page — matches the design in user's screenshot.
// Each card navigates to a dedicated sub-page that wires the real backend API.
import {
  Box,
  Typography,
  Card,
  CardActionArea,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PublicIcon from "@mui/icons-material/Public";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import RuleFolderOutlinedIcon from "@mui/icons-material/RuleFolderOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import "./AdvancedSettings.css";

const sections = [
  {
    icon: <PublicIcon sx={{ fontSize: 20, color: "#7b6b3a" }} />,
    title: "Branding",
    items: [
      {
        label: "Tenant Logo",
        description: "Upload your organisation's logo (PNG). Shown in the top navbar for everyone on your account.",
        path: "/advancedsettings/branding",
      },
    ],
  },
  {
    icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 20, color: "#7b6b3a" }} />,
    title: "Receipts",
    items: [
      {
        label: "Receipt Settings",
        description: "Organisation details on the receipt header, receipt number format, and footer terms — with a live preview.",
        path: "/advancedsettings/receipts",
      },
    ],
  },
  {
    icon: <GraphicEqIcon sx={{ fontSize: 20, color: "#7b6b3a" }} />,
    title: "Mobile Call Recorder",
    items: [
      {
        label: "Recorder App Settings",
        description: "Daily time at which the counsellor app uploads the call recordings found on the phone.",
        path: "/advancedsettings/recorder",
      },
    ],
  },
  {
    icon: <WhatsAppIcon sx={{ fontSize: 20, color: "#25D366" }} />,
    title: "WhatsApp",
    items: [
      {
        label: "WhatsApp Settings",
        description: "Connect your WABridge account/number, and get the webhook URL for incoming messages.",
        path: "/advancedsettings/whatsapp",
      },
    ],
  },
  {
    icon: <PublicIcon sx={{ fontSize: 20, color: "#7b6b3a" }} />,
    title: "Dropdown Values",
    items: [
      { label: "Setup Dropdown Values", path: "/advancedsettings/dropdowns" },
    ],
  },
  {
    icon: <PeopleAltOutlinedIcon sx={{ fontSize: 20, color: "#555" }} />,
    title: "Users & Roles",
    items: [
      { label: "User Profiles", path: "/advancedsettings/users" },
      {
        label: "Branches",
        description: "Create and manage branches, set each branch's manager, and assign users.",
        path: "/advancedsettings/branches",
      },
      {
        label: "Org Tree",
        description: "Visual hierarchy of super admins, managers, and counsellors.",
        path: "/advancedsettings/org-tree",
      },
    ],
  },
  {
    icon: <ChatOutlinedIcon sx={{ fontSize: 20, color: "#555" }} />,
    title: "Communications",
    items: [
      { label: "Template Settings", path: "/advancedsettings/templates" },
    ],
  },
  {
    icon: <RuleFolderOutlinedIcon sx={{ fontSize: 20, color: "#555" }} />,
    title: "Lead Routing",
    items: [
      {
        label: "Lead Distribution",
        description: "Send WhatsApp, Instagram, Facebook or Website leads to a chosen person — or a group who share them. Checked before the assignment rule.",
        path: "/advancedsettings/lead-distribution",
      },
      {
        label: "Assignment Rules",
        description: "Round-robin, load-balanced, and program-based auto-assignment.",
        path: "/advancedsettings/assignment-rules",
      },
      {
        label: "JustDial Lead Assignment",
        description: "Choose which counsellors receive JustDial (Gmail) leads — they'll be round-robin'd only among the selected counsellors.",
        path: "/advancedsettings/justdial-assignment",
      },
    ],
  },
  {
    icon: <AccountBalanceOutlinedIcon sx={{ fontSize: 20, color: "#555" }} />,
    title: "Payments",
    items: [
      {
        label: "Payment Accounts",
        description: "Bank accounts & UPI IDs for collecting fee payments — registration, installments & other dues. One is primary.",
        path: "/advancedsettings/payment-accounts",
      },
    ],
  },
  {
    icon: <AutorenewIcon sx={{ fontSize: 20, color: "#555" }} />,
    title: "Subscription Manager",
    items: [
      {
        label: "Manage your subscriptions",
        description: "View and manage your WhatsApp credit usage",
        path: "/advancedsettings/subscription",
      },
    ],
  },
];

const AdvancedSettings = () => {
  const navigate = useNavigate();
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
              <CardActionArea
                className="advanced-settings-card-action"
                onClick={() => item.path && navigate(item.path)}
              >
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
