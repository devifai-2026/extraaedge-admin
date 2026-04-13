import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { colors } from '../../theme/colors'
import SearchIcon from '@mui/icons-material/Search';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AddIcon from '@mui/icons-material/Add';
import PhoneIcon from '@mui/icons-material/Phone';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import QuickAdd from '../QuickAdd/QuickAdd'
import './Header.css'
import {
    Menu,
    MenuItem,
    Divider,
    Typography,
    Box,
    Avatar
} from "@mui/material";

function Header() {
    const navigate = useNavigate()

    // Timer state (example: 20 minutes 35 seconds)
    const [timeLeft, setTimeLeft] = useState(20 * 60 + 35) // seconds

    // Search context: 'applicant' or 'application'
    const [searchContext, setSearchContext] = useState('applicant')
    const [showContextMenu, setShowContextMenu] = useState(false)

    // Global Search dropdown state (you can add actual menu items later)
    const [showGlobalMenu, setShowGlobalMenu] = useState(false)

    // Notification dropdown state
    const [showNotifications, setShowNotifications] = useState(false)

    // Quick Add modal state
    const [showQuickAdd, setShowQuickAdd] = useState(false)

    // Recent Calls dropdown state
    const [showRecentCalls, setShowRecentCalls] = useState(false)
    const [anchorEl, setAnchorEl] = useState(null);
    const openUserMenu = Boolean(anchorEl);

    // Sample follow-up data
    const followUps = [
        { name: 'DAWARE RAHUL KIRAN', date: 'Apr 9, 2026 11:00 PM', ago: '4 days ago' },
        { name: 'Pradip Pawar', date: 'Apr 9, 2026 10:58 AM', ago: '4 days ago' },
        { name: 'VAIJUNATH MALGONDA', date: 'Apr 8, 2026 6:05 PM', ago: '5 days ago' },
        { name: 'Lipika', date: 'Apr 8, 2026 3:59 PM', ago: '5 days ago' },
        { name: 'BANKAR SOHAM ASHOK', date: 'Apr 4, 2026 10:38 PM', ago: '9 days ago' },
        { name: 'PRIT', date: 'Apr 3, 2026 2:15 PM', ago: '10 days ago' },
    ]

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h.toString().padStart(2, '0')}:${m
            .toString()
            .padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/')
    }

    const getPlaceholder = () => {
        return searchContext === 'applicant'
            ? 'Search by Applicant Name, Email Id or WhatsApp #'
            : 'Search by Application Name, Email Id or WhatsApp #'
    }

    const handleUserClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleUserClose = () => {
        setAnchorEl(null);
    };

    return (
        <header
            className="header"
            style={{
                backgroundColor: colors.white,
                borderBottom: `1px solid ${colors.borderGrey}`,
            }}
        >
            {/* Brand & Timer Section */}
            <div className="header-brand">
                <span className="brand-text">SPEEDUP INNOVATION</span>

            </div>

            <div className='main-container'>
                <div className="header-search-wrapper">
                    <div>
                        <div className="global-search-dropdown">
                            <button
                                className="global-search-btn"
                                onClick={() => setShowGlobalMenu(!showGlobalMenu)}
                            >
                                Global Search
                                <ExpandMoreIcon sx={{ fontSize: 18, marginLeft: '4px' }} />
                            </button>
                            {showGlobalMenu && (
                                <div className="global-menu">
                                    <div className="menu-item">Applicant Name</div>
                                    <div className="menu-item">WhatsApp Number</div>
                                    <div className="menu-item">Email Id</div>
                                </div>
                            )}
                        </div>
                    </div>


                    <div className="search-input-wrapper">
                        <input
                            type="text"
                            className="search-input"
                            placeholder={getPlaceholder()}
                            style={{ color: colors.textDark }}
                        />
                        <SearchIcon className="search-icon" sx={{ fontSize: 20 }} />
                    </div>

                </div>
                <div className='sub-container'>
                    <div className="header-actions">
                        <div className="notification-wrapper">
                            <button
                                className="header-btn notification-btn"
                                title="Notifications"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <NotificationsActiveIcon sx={{ fontSize: 22, color: colors.primary }} />
                                <span className="notification-badge">{followUps.length}</span>
                            </button>
                            {showNotifications && (
                                <div className="notification-dropdown">
                                    <div className="notification-arrow" />
                                    <div className="notification-header">
                                        Follow ups ({followUps.length})
                                    </div>
                                    <div className="notification-list">
                                        {followUps.map((item, index) => (
                                            <div key={index} className="notification-item">
                                                <div className="notification-item-top">
                                                    <span className="notification-name">{item.name}:</span>
                                                    <span className="notification-action">Add Follow Up</span>
                                                </div>
                                                <div className="notification-time">
                                                    {item.date} &middot; {item.ago}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button className="header-btn add-btn" title="Add" onClick={() => setShowQuickAdd(true)}>
                            <AddIcon sx={{ fontSize: 22, color: colors.primary }} />
                        </button>

                        <div className="recent-calls-wrapper">
                            <button
                                className="header-btn phone-btn"
                                title="Phone"
                                onClick={() => setShowRecentCalls(!showRecentCalls)}
                            >
                                <PhoneIcon sx={{ fontSize: 22, color: colors.primary }} />
                            </button>
                            {showRecentCalls && (
                                <div className="recent-calls-dropdown">
                                    <div className="recent-calls-arrow" />
                                    <div className="recent-calls-header">
                                        Recent Calls
                                    </div>
                                    <div className="recent-calls-body">
                                        <div className="recent-calls-empty">
                                            <div className="recent-calls-bell">
                                                <NotificationsActiveIcon sx={{ fontSize: 64, color: '#e0e0e0' }} />
                                                <span className="recent-calls-badge">0</span>
                                            </div>
                                            <p className="recent-calls-text">You have no recent calls!</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <div className="timer">{formatTime(timeLeft)}</div>
                        <div>
                            {/* USER BUTTON */}
                            <button
                                className="header-btn user-btn"
                                onClick={handleUserClick}
                            >
                                <AccountCircleIcon sx={{ fontSize: 40 }} />
                            </button>

                            {/* USER MENU */}
                            <Menu
                                anchorEl={anchorEl}
                                open={openUserMenu}
                                onClose={handleUserClose}
                                anchorOrigin={{
                                    vertical: "bottom",
                                    horizontal: "right",
                                }}
                                transformOrigin={{
                                    vertical: "top",
                                    horizontal: "right",
                                }}
                                PaperProps={{
                                    elevation: 4,
                                    sx: {
                                        mt: 1.5,
                                        width: 270,
                                        borderRadius: "10px",
                                        overflow: "visible",
                                        boxShadow: "0px 4px 20px rgba(0,0,0,0.15)",

                                        // 🔥 Arrow
                                        "&::before": {
                                            content: '""',
                                            display: "block",
                                            position: "absolute",
                                            top: 0,
                                            right: 20,
                                            width: 10,
                                            height: 10,
                                            bgcolor: "background.paper",
                                            transform: "translateY(-50%) rotate(45deg)",
                                            zIndex: 0,
                                            borderLeft: "1px solid #e0e0e0",
                                            borderTop: "1px solid #e0e0e0",
                                        },
                                    },
                                }}
                            >
                                {/* USER INFO */}
                                <Box sx={{ px: 2, py: 1.5, display: "flex", gap: 1 }}>
                                    <Avatar sx={{ width: 40, height: 40 }} />
                                    <Box>
                                        <Typography fontWeight={600} fontSize={14}>
                                            Divya Nair
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            counselor4@speedupinfotech.com
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            8669012416
                                        </Typography>
                                    </Box>
                                </Box>

                                <Divider />

                                {/* OPTION */}
                                <MenuItem onClick={handleUserClose}>
                                    Request a feature
                                </MenuItem>

                                {/* LOGOUT */}
                                <MenuItem
                                    onClick={() => {
                                        handleUserClose();
                                        handleLogout();
                                    }}
                                    sx={{
                                        justifyContent: "flex-end",
                                        color: "#ff5722",
                                        fontWeight: 500,
                                    }}
                                >
                                    Log out
                                </MenuItem>
                            </Menu>
                        </div>
                    </div>
                </div>

            </div>

            <QuickAdd open={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
        </header>
    )
}

export default Header