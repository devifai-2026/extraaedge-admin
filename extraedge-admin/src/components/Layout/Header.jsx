import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { colors } from '../../theme/colors'
import { auth, authApi, notificationsApi, followUpsApi, leadsApi } from '../../lib/endpoints'
import { connectSocket, onNotification, isSocketConnected } from '../../lib/socket'
import WorkTimer from './WorkTimer'
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
    Avatar,
    Popover,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Button,
    Badge,
} from "@mui/material";

function Header() {
    const navigate = useNavigate()

    // Search context: 'applicant' or 'application'
    const [searchContext, setSearchContext] = useState('applicant')
    const [showContextMenu, setShowContextMenu] = useState(false)

    // Global Search dropdown state (you can add actual menu items later)
    const [showGlobalMenu, setShowGlobalMenu] = useState(false)

    // Notification dropdown state
    const [showNotifications, setShowNotifications] = useState(false)
    const [anchorNotification, setAnchorNotification] = useState(null)

    // Quick Add modal state
    const [showQuickAdd, setShowQuickAdd] = useState(false)

    // Recent Calls dropdown state
    const [showRecentCalls, setShowRecentCalls] = useState(false)
    const [anchorRecentCalls, setAnchorRecentCalls] = useState(null)
    const [anchorEl, setAnchorEl] = useState(null);
    const openUserMenu = Boolean(anchorEl);

    // Real follow-ups (loaded on mount)
    const [followUps, setFollowUps] = useState([])

    // Live notifications pushed over the websocket. Last 50 only.
    const [liveEvents, setLiveEvents] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [socketLive, setSocketLive] = useState(false)

    // Global search state
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [showSearchResults, setShowSearchResults] = useState(false)
    const searchTimer = useRef(null)
    const searchWrapperRef = useRef(null)

    useEffect(() => {
        let cancelled = false
        followUpsApi.myUpcoming()
            .then((r) => { if (!cancelled) setFollowUps((r?.data || []).slice(0, 10)) })
            .catch(() => {})
        return () => { cancelled = true }
    }, [])

    // Open the websocket once for the session and subscribe to events.
    useEffect(() => {
        const sock = connectSocket()
        if (!sock) return
        const onConnect = () => setSocketLive(true)
        const onDisconnect = () => setSocketLive(false)
        sock.on('connect', onConnect)
        sock.on('disconnect', onDisconnect)
        if (sock.connected) setSocketLive(true)

        const off = onNotification((evt) => {
            // Push newest first, cap at 50.
            setLiveEvents((prev) => [{ ...evt, id: `${evt.type}-${evt.lead_id || ''}-${evt.occurred_at}` }, ...prev].slice(0, 50))
            // Bump the badge unless the notification panel is currently open.
            setUnreadCount((n) => (anchorNotification ? 0 : n + 1))
        })
        return () => {
            sock.off('connect', onConnect)
            sock.off('disconnect', onDisconnect)
            off()
        }
        // anchorNotification dep intentionally omitted — we read it directly so
        // counter keeps incrementing while panel is closed and resets on open.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Reset unread when user opens the panel.
    useEffect(() => {
        if (anchorNotification) setUnreadCount(0)
    }, [anchorNotification])

    // Debounced global search against /leads?q=…
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current)
        const q = searchQuery.trim()
        if (q.length < 2) {
            setSearchResults([])
            setSearchLoading(false)
            return
        }
        setSearchLoading(true)
        searchTimer.current = setTimeout(() => {
            leadsApi.list({ q, limit: 10 })
                .then((r) => setSearchResults(r?.data || []))
                .catch(() => setSearchResults([]))
                .finally(() => setSearchLoading(false))
        }, 300)
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
    }, [searchQuery])

    // Close results when clicking outside
    useEffect(() => {
        const onClick = (e) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
                setShowSearchResults(false)
                setShowGlobalMenu(false)
            }
        }
        document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [])

    // Open the full search-results page with the current query.
    const goToSearchPage = () => {
        const q = searchQuery.trim()
        if (!q) return
        setShowSearchResults(false)
        navigate(`/search?q=${encodeURIComponent(q)}`)
    }
    // Single hit click — go straight to the search page (which opens the lead's
    // edit dialog via the result list).
    const handleResultClick = () => {
        setSearchResults([])
        setShowSearchResults(false)
        goToSearchPage()
    }

    const handleLogout = async () => {
        try { await authApi.logout(); } catch { /* ignore */ }
        // Tear down the websocket so the next login opens a fresh session.
        try { (await import('../../lib/socket')).disconnectSocket(); } catch { /* ignore */ }
        auth.clear()
        navigate('/')
    }

    const sessionUser = auth.getUser()
    const sessionTenant = auth.getTenant()

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
                <span className="brand-text">{sessionTenant?.brand_name || sessionTenant?.name || 'EXTRAEDGE'}</span>
            </div>

            <div className='main-container'>
                <div className="header-search-wrapper" ref={searchWrapperRef} style={{ position: 'relative' }}>
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
                                <div className="global-menu" style={{ zIndex: 1300 }}>
                                    <div className="menu-item" onClick={() => { setSearchContext('applicant'); setShowGlobalMenu(false); }}>Applicant Name</div>
                                    <div className="menu-item" onClick={() => { setSearchContext('applicant'); setShowGlobalMenu(false); }}>WhatsApp Number</div>
                                    <div className="menu-item" onClick={() => { setSearchContext('applicant'); setShowGlobalMenu(false); }}>Email Id</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="search-input-wrapper-header" style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="search-input"
                            placeholder={getPlaceholder()}
                            style={{ color: colors.textDark }}
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                            onFocus={() => setShowSearchResults(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') { setShowSearchResults(false); }
                                if (e.key === 'Enter' && searchQuery.trim()) { goToSearchPage(); }
                            }}
                        />
                        <SearchIcon className="search-icon" sx={{ fontSize: 20 }} />

                        {showSearchResults && searchQuery.trim().length >= 2 && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    left: 0,
                                    right: 0,
                                    background: '#fff',
                                    border: `1px solid ${colors.borderGrey}`,
                                    borderRadius: 1.5,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                    maxHeight: 360,
                                    overflowY: 'auto',
                                    zIndex: 1300,
                                }}
                            >
                                {searchLoading && (
                                    <Box sx={{ p: 2, fontSize: 13, color: '#888', textAlign: 'center' }}>Searching…</Box>
                                )}
                                {!searchLoading && searchResults.length === 0 && (
                                    <Box sx={{ p: 2, fontSize: 13, color: '#888', textAlign: 'center' }}>
                                        No leads matching "{searchQuery}"
                                    </Box>
                                )}
                                {!searchLoading && searchResults.length > 0 && (
                                    <List dense disablePadding>
                                        {searchResults.map((r) => (
                                            <ListItem
                                                key={r.id}
                                                disablePadding
                                                sx={{ borderBottom: `1px solid ${colors.borderGrey}`, '&:last-child': { borderBottom: 'none' } }}
                                            >
                                                <ListItemButton onClick={() => handleResultClick(r)}>
                                                    <ListItemText
                                                        primary={
                                                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                                                                {r.name || r.email || r.phone}
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Typography sx={{ fontSize: 12, color: colors.midGrey }}>
                                                                {[r.email, r.phone, r.stage_name].filter(Boolean).join(' · ')}
                                                            </Typography>
                                                        }
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        ))}
                                        <ListItem disablePadding sx={{ borderTop: `2px solid ${colors.borderGrey}` }}>
                                            <ListItemButton onClick={goToSearchPage} sx={{ justifyContent: 'center' }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: colors.primary }}>
                                                    View all results →
                                                </Typography>
                                            </ListItemButton>
                                        </ListItem>
                                    </List>
                                )}
                            </Box>
                        )}
                    </div>

                </div>
                <div className='sub-container'>
                    <div className="header-actions">
                        <div className="notification-wrapper">
                            <button
                                className="header-btn notification-btn"
                                title={socketLive ? 'Notifications (live)' : 'Notifications (offline)'}
                                onClick={(e) => setAnchorNotification(e.currentTarget)}
                            >
                                <Badge
                                    badgeContent={unreadCount + followUps.length}
                                    color="error"
                                    max={99}
                                >
                                    <NotificationsActiveIcon sx={{ fontSize: 22, color: socketLive ? colors.primary : '#999' }} />
                                </Badge>
                            </button>
                            <NotificationsPopover
                                anchor={anchorNotification}
                                onClose={() => setAnchorNotification(null)}
                                liveEvents={liveEvents}
                                followUps={followUps}
                                socketLive={socketLive}
                                onClear={() => setLiveEvents([])}
                                onNavigateLead={(leadId) => {
                                    setAnchorNotification(null)
                                    // Land on the Lead Manager with ?focus=<id>;
                                    // LeadList opens the edit dialog for that lead on mount.
                                    if (leadId) navigate(`/leadlist?focus=${leadId}`)
                                    else navigate('/leadlist')
                                }}
                            />
                        </div>

                        <button className="header-btn add-btn" title="Add" onClick={() => setShowQuickAdd(true)}>
                            <AddIcon sx={{ fontSize: 22, color: colors.primary }} />
                        </button>

                        <div className="recent-calls-wrapper">
                            <button
                                className="header-btn phone-btn"
                                title="Phone"
                                onClick={(e) => setAnchorRecentCalls(e.currentTarget)}
                            >
                                <PhoneIcon sx={{ fontSize: 22, color: colors.primary }} />
                            </button>
                            <Popover
                                open={Boolean(anchorRecentCalls)}
                                anchorEl={anchorRecentCalls}
                                onClose={() => setAnchorRecentCalls(null)}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'right',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                            >
                                <Box sx={{ width: 320 }}>
                                    <Box sx={{ 
                                        px: 2, 
                                        py: 1.5, 
                                        borderBottom: `1px solid ${colors.borderGrey}`,
                                        fontWeight: 600,
                                        fontSize: 15
                                    }}>
                                        Recent Calls
                                    </Box>
                                    <Box sx={{ 
                                        p: 3, 
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 2
                                    }}>
                                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                            <NotificationsActiveIcon sx={{ fontSize: 64, color: '#e0e0e0' }} />
                                            <Box sx={{
                                                position: 'absolute',
                                                top: 2,
                                                right: -4,
                                                backgroundColor: colors.primary,
                                                color: colors.white,
                                                borderRadius: '50%',
                                                width: '20px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                            }}>
                                                0
                                            </Box>
                                        </Box>
                                        <Typography sx={{ fontSize: 14, color: colors.midGrey }}>
                                            You have no recent calls!
                                        </Typography>
                                    </Box>
                                </Box>
                            </Popover>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <WorkTimer />
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
                                            {sessionUser?.name || sessionUser?.email || 'User'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {sessionUser?.email}
                                        </Typography>
                                        {sessionUser?.phone && (
                                            <Typography variant="body2" color="text.secondary">
                                                {sessionUser.phone}
                                            </Typography>
                                        )}
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

/* ==============================================================
   Real-time notifications popover.
   Two tabs:
     Live   → events pushed over the websocket (lead.assigned / reassigned /
              stage_changed). Newest first; click to open the lead.
     Follow-ups → today's planned follow-ups loaded over REST.
   ============================================================== */
function NotificationsPopover({ anchor, onClose, liveEvents, followUps, socketLive, onClear, onNavigateLead }) {
    const [tab, setTab] = useState('live')

    const titleFor = (e) => {
        if (e.type === 'lead.assigned')      return e.payload?.auto ? 'New lead auto-assigned' : 'New lead assigned'
        if (e.type === 'lead.reassigned')    return 'Lead reassigned'
        if (e.type === 'lead.stage_changed') return 'Lead stage changed'
        if (e.type === 'lead.created')       return 'Lead created'
        return e.type || 'Event'
    }
    const iconColor = (e) => {
        if (e.type === 'lead.assigned')      return '#43A047'
        if (e.type === 'lead.reassigned')    return '#FB8C00'
        if (e.type === 'lead.stage_changed') return '#1E88E5'
        return colors.primary
    }
    const fmtRel = (iso) => {
        if (!iso) return ''
        const sec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
        if (sec < 60) return `${sec}s ago`
        if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
        if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
        return new Date(iso).toLocaleDateString()
    }

    return (
        <Popover
            open={Boolean(anchor)}
            anchorEl={anchor}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            <Box sx={{ width: 380, maxHeight: 480, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${colors.borderGrey}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Notifications</Typography>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                        color: socketLive ? '#16a34a' : '#dc2626', fontWeight: 600,
                    }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: socketLive ? '#16a34a' : '#dc2626',
                        }} />
                        {socketLive ? 'Live' : 'Offline'}
                    </span>
                </Box>

                <Box sx={{ display: 'flex', borderBottom: `1px solid ${colors.borderGrey}` }}>
                    <button
                        onClick={() => setTab('live')}
                        style={{
                            flex: 1, padding: '10px 0', background: 'none', border: 'none',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer',
                            color: tab === 'live' ? colors.primary : '#666',
                            borderBottom: tab === 'live' ? `2px solid ${colors.primary}` : '2px solid transparent',
                        }}
                    >
                        Live ({liveEvents.length})
                    </button>
                    <button
                        onClick={() => setTab('followups')}
                        style={{
                            flex: 1, padding: '10px 0', background: 'none', border: 'none',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer',
                            color: tab === 'followups' ? colors.primary : '#666',
                            borderBottom: tab === 'followups' ? `2px solid ${colors.primary}` : '2px solid transparent',
                        }}
                    >
                        Follow-ups ({followUps.length})
                    </button>
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 380 }}>
                    {tab === 'live' && (
                        <>
                            {liveEvents.length === 0 && (
                                <Box sx={{ p: 4, textAlign: 'center', color: '#888', fontSize: 13 }}>
                                    No real-time events yet. They'll appear here as soon as
                                    leads are assigned, reassigned, or move stages.
                                </Box>
                            )}
                            {liveEvents.length > 0 && (
                                <List dense disablePadding>
                                    {liveEvents.map((e) => (
                                        <ListItem
                                            key={e.id}
                                            disablePadding
                                            sx={{ borderBottom: `1px solid ${colors.borderGrey}` }}
                                        >
                                            <ListItemButton onClick={() => onNavigateLead?.(e.lead_id)}>
                                                <Box sx={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: iconColor(e), mr: 1.5,
                                                }} />
                                                <ListItemText
                                                    primary={
                                                        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                                                            {titleFor(e)}{e.lead_name ? ` · ${e.lead_name}` : ''}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Typography sx={{ fontSize: 11, color: '#888' }}>
                                                            {fmtRel(e.occurred_at)}
                                                            {e.payload?.reason ? ` · ${e.payload.reason}` : ''}
                                                        </Typography>
                                                    }
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </>
                    )}

                    {tab === 'followups' && (
                        <>
                            {followUps.length === 0 && (
                                <Box sx={{ p: 4, textAlign: 'center', color: '#888', fontSize: 13 }}>
                                    No upcoming follow-ups.
                                </Box>
                            )}
                            <List dense disablePadding>
                                {followUps.map((item, index) => (
                                    <ListItem key={index} disablePadding sx={{ borderBottom: `1px solid ${colors.borderGrey}` }}>
                                        <ListItemButton onClick={() => onNavigateLead?.(item.lead_id)}>
                                            <ListItemText
                                                primary={
                                                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                                                        {item.lead_name || 'Follow-up'}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Typography sx={{ fontSize: 11, color: '#888' }}>
                                                        {item.next_action_datetime ? new Date(item.next_action_datetime).toLocaleString() : '—'}
                                                        {item.comment ? ` · ${String(item.comment).slice(0, 50)}` : ''}
                                                    </Typography>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </>
                    )}
                </Box>

                {tab === 'live' && liveEvents.length > 0 && (
                    <Box sx={{ borderTop: `1px solid ${colors.borderGrey}`, p: 1, textAlign: 'center' }}>
                        <button
                            onClick={onClear}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#666', fontSize: 12, fontWeight: 600,
                            }}
                        >
                            Clear all
                        </button>
                    </Box>
                )}
            </Box>
        </Popover>
    )
}

export default Header