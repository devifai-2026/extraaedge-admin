import React from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

const integrations = [
  {
    id: 1,
    title: "ExtraaEdge",
    description:
      "Click here to view ExtraaEdge API documentation please contact support@theextraaedge.com",
    logo:
      "https://via.placeholder.com/150x60?text=extraaedge",
    showButton: false
  },
  {
    id: 2,
    title: "Facebook Ads",
    description: "",
    logo:
      "https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png",
    showButton: true
  },
  {
    id: 3,
    title: "ExtraaEdge",
    description: "",
    logo:
      "https://via.placeholder.com/120x50?text=extraaedge",
    showButton: true
  }
];

const IntegrationPartners = () => {
  return (
    <Box sx={{ p: 3, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          sx={{ color: "#f37021", fontWeight: 600 }}
        >
          Our Integration Partners
        </Typography>

        <Typography variant="body2" sx={{ color: "#555", mt: 1 }}>
          ExtraaEdge integrates seamlessly with these third-party apps,
          enhancing your admission & marketing experience. If your software
          or tool is not on this list, no worries, just send us an email at
          support@theextraaedge.com
        </Typography>
      </Box>

      {/* Cards */}
      <Grid container spacing={3}>
        {integrations.map((item) => (
          <Grid item xs={12} md={4} key={item.id}>
            <Card
              sx={{
                height: 220,
                borderRadius: 2,
                position: "relative",
                boxShadow: "none",
                border: "1px solid #e0e0e0"
              }}
            >
              {/* Top Icons */}
              <Box
                sx={{
                  position: "absolute",
                  top: 10,
                  left: 10
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 18, color: "#888" }} />
              </Box>

              <Box
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10
                }}
              >
                <VisibilityOutlinedIcon sx={{ fontSize: 18, color: "#000" }} />
              </Box>

              <CardContent
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center"
                }}
              >
                {/* Logo */}
                <img
                  src={item.logo}
                  alt={item.title}
                  style={{ height: 50, objectFit: "contain" }}
                />

                {/* Description */}
                {item.description && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 2, color: "#555", px: 2 }}
                  >
                    {item.description}
                  </Typography>
                )}

                {/* Button */}
                {item.showButton && (
                  <Button
                    variant="contained"
                    sx={{
                      mt: 2,
                      backgroundColor: "#f37021",
                      textTransform: "none",
                      borderRadius: "6px",
                      px: 3,
                      "&:hover": {
                        backgroundColor: "#d95f14"
                      }
                    }}
                  >
                    CLICK TO INTEGRATE
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default IntegrationPartners;