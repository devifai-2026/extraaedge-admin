import React, { useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { colors } from '../../theme/colors';
import './AnalyticsDashboard.css';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import DateRangePicker from '../../components/DatePicker/DatePicker';
import LeadsChart from '../../components/LeadsTimelineReport/LeadsTimelineReport';
import LeadFunnel from '../../components/LeadFunnel/LeadFunnel';
import ProgramWise from '../../components/ProgramWise/TableProgramWise'
import ChannelSource from '../../components/ChannnelSource/ChannelSource'
import ProgramStatus from '../../components/programStatus/programStatus';
import ColdEnquiries from '../../components/ColdEnquiries/coldEnquiries';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import SummarizeIcon from '@mui/icons-material/Summarize';
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import InputAdornment from "@mui/material/InputAdornment";

// Modal style
const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 500,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
};

function AnalyticsDashboard() {
    const [openModal, setOpenModal] = useState(false);

    const Counselors = [
        { id: 1, counselor: 'Divya Nair' },
        { id: 2, counselor: 'James Mitchell' },
        { id: 3, counselor: 'Sarah Johnson' }
    ];

    const handleDateRangeApply = (range) => {
        console.log('Selected date range:', range);
        // Here you can filter dashboard data based on the range
    };

    // Handle page reload when RefreshIcon is clicked
    const handleRefresh = () => {
        window.location.reload();
    };

    // Handle modal open/close
    const handleOpenModal = () => setOpenModal(true);
    const handleCloseModal = () => setOpenModal(false);

    const [openFilterModal, setOpenFilterModal] = useState(false);

    const handleOpenFilter = () => setOpenFilterModal(true);
    const handleCloseFilter = () => setOpenFilterModal(false);

    // Sample data for the summary modal - replace with your actual data
    const summaryData = [
        { title: 'Total Leads', value: '11', change: '+2 vs last week' },
        { title: 'Email Consumed', value: '1', change: '0 vs last week' },
        { title: 'SMS Consumed', value: '0', change: '0 vs last week' },
        { title: 'WhatsApp Consumed', value: '0', change: '0 vs last week' },
        { title: 'Active Programs', value: '5', change: '1 new' },
        { title: 'Conversion Rate', value: '24%', change: '+5% vs last month' },
    ];

    return (
        <>
            <div className='first-container'>
                <div>
                    <h2>Analytics Dashboard</h2>
                </div>
                <div className='first-container-rightside-contain'>
                    <button className="dashboard-button">Dashboard Index</button>
                    <Divider orientation="vertical" />
                    <RefreshIcon
                        sx={{ fontSize: 35, color: colors.primary, cursor: 'pointer' }}
                        onClick={handleRefresh}
                    />
                    <SummarizeIcon
                        sx={{ fontSize: 35, color: colors.primary, cursor: 'pointer' }}
                        onClick={handleOpenModal}
                    />
                </div>
            </div>
            <Divider />




            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', marginTop: '10px' }}>
                <div>
                    <FilterAltIcon
                        sx={{ fontSize: 30, color: colors.primary, cursor: "pointer" }}
                        onClick={handleOpenFilter}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div>
                        <Autocomplete
                            disablePortal
                            options={Counselors.map((option) => option.counselor)}
                            sx={{ width: 300 }}
                            renderInput={(params) => <TextField {...params} label="Select Counselor" />}
                        />
                    </div>
                    <div>
                        <DateRangePicker onApply={handleDateRangeApply} />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', marginTop: "10px" }}>
                <div className='card_analytics'>
                    <div className='header_analytics'>
                        <span className='title_analytics'>Lead Summary</span>
                        <RefreshIcon className='icon_analytics' onClick={handleRefresh} />
                    </div>
                    <div className='badge_analytics'><span className='badge_content'>11</span></div>
                    <div className='content_analytics'>
                        <span className='label_analytics'>Lead</span>
                        <span className='value_analytics'>11</span>
                    </div>
                </div>
                <div className='card_analytics'>
                    <div className='header_analytics'>
                        <span className='title_analytics'>Communication Summary</span>
                        <RefreshIcon className='icon_analytics' onClick={handleRefresh} />
                    </div>
                    <div className='content_analytics'>
                        <span className='label_analytics'>Email Consumed</span>
                        <span className='value_analytics'>1</span>
                    </div>
                    <div className='content_analytics'>
                        <span className='label_analytics'>SMS Consumed</span>
                        <span className='value_analytics'>0</span>
                    </div>
                    <div className='content_analytics'>
                        <span className='label_analytics'>Total WhatsApp Consumed</span>
                        <span className='value_analytics'>0</span>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: "10px" }}>
                <LeadsChart />
            </div>
            <div style={{ marginTop: "10px" }}>
                <LeadFunnel />
            </div>
            <div style={{ marginTop: "10px" }}>
                <ProgramWise />
            </div>
            <div style={{ marginTop: "10px" }}>
                <ChannelSource />
            </div>
            <div style={{ marginTop: "10px" }}>
                <ProgramStatus />
            </div>
            <div style={{ marginTop: "10px" }}>
                <ColdEnquiries />
            </div>

            {/* SummarizeIcon model */}
            <Modal open={openModal} onClose={handleCloseModal}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "80%",
                        height: "80%",
                        bgcolor: "#fff",
                        borderRadius: "8px",
                        boxShadow: 24,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "16px 20px",
                            borderBottom: "1px solid #eee",
                            backgroundColor: "#f5e9df",
                            borderTopLeftRadius: "8px",
                            borderTopRightRadius: "8px",
                        }}
                    >
                        <Typography sx={{ fontSize: "18px", fontWeight: 500 }}>
                            Scheduled Report List
                        </Typography>

                        <CloseIcon
                            onClick={handleCloseModal}
                            sx={{ cursor: "pointer" }}
                        />
                    </Box>

                    {/* Search Bar */}
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            padding: "12px 20px",
                        }}
                    >
                        <TextField
                            placeholder="Search by Report name or Email"
                            size="small"
                            sx={{ width: "300px" }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    {/* Content Area */}
                    <Box
                        sx={{
                            flex: 1,
                            margin: "0 20px 20px 20px",
                            border: "1px solid #e0e0e0",
                            borderRadius: "6px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexDirection: "column",
                            color: "#888",
                        }}
                    >
                        {/* Empty State */}
                        <SentimentDissatisfiedIcon sx={{ fontSize: 60, opacity: 0.5 }} />

                        <Typography sx={{ mt: 2, fontWeight: 500 }}>
                            No search result found in this list!
                        </Typography>

                        <Typography sx={{ fontSize: "14px" }}>
                            Try searching something else.
                        </Typography>
                    </Box>
                </Box>
            </Modal>

            {/* Filter Modal */}

            <Modal open={openFilterModal} onClose={handleCloseFilter}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "34%",
                        transform: "translate(-50%, -50%)",
                        width: "700px",
                        bgcolor: "#fff",
                        borderRadius: "8px",
                        boxShadow: 24,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 16px",
                            borderBottom: "1px solid #eee",
                        }}
                    >
                        <Typography sx={{ fontWeight: 500 }}>
                            Create Filter
                        </Typography>

                        <CloseIcon
                            sx={{ cursor: "pointer" }}
                            onClick={handleCloseFilter}
                        />
                    </Box>

                    {/* Sub Header */}
                    <Box sx={{ padding: "10px 16px", borderBottom: "1px solid #eee", fontSize: "14px", color: "#666" }}>
                        No filter is selected.
                    </Box>

                    {/* Body */}
                    <Box sx={{ flex: 1, display: "flex" }}>

                        {/* LEFT SIDE */}
                        <Box
                            sx={{
                                width: "40%",
                                borderRight: "1px solid #eee",
                                overflowY: "auto",
                                padding: "10px",
                            }}
                        >
                            {[
                                "Channel",
                                "Primary Source",
                                "Source",
                                "Campaign",
                                "Medium",
                                "Lead Category",
                                "Stage",
                                "Sub-Stage",
                                "Program",
                                "Lead Stage",
                                "Lead Sub-Stage",
                                "Country",
                                "State",
                                "District",
                                "City",
                            ].map((item, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "6px 4px",
                                    }}
                                >
                                    <input type="checkbox" />
                                    <Typography sx={{ fontSize: "14px" }}>{item}</Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* RIGHT SIDE */}
                        <Box
                            sx={{
                                flex: 1,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                color: "#888",
                                fontSize: "14px",
                            }}
                        >
                            Please select filters and click apply.
                        </Box>
                    </Box>

                    {/* Footer */}
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "10px",
                            padding: "10px 16px",
                            borderTop: "1px solid #eee",
                        }}
                    >
                        <Button
                            variant="outlined"
                            size="small"
                            sx={{ textTransform: "none" }}
                        >
                            RESET
                        </Button>

                        <Button
                            variant="contained"
                            size="small"
                            sx={{
                                textTransform: "none",
                                backgroundColor: colors.primary,
                            }}
                        >
                            APPLY
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </>
    );
}

export default AnalyticsDashboard;