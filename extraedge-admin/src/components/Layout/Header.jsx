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
import './Header.css'

function Header() {
    const navigate = useNavigate()

    // Timer state (example: 20 minutes 35 seconds)
    const [timeLeft, setTimeLeft] = useState(20 * 60 + 35) // seconds

    // Search context: 'applicant' or 'application'
    const [searchContext, setSearchContext] = useState('applicant')
    const [showContextMenu, setShowContextMenu] = useState(false)

    // Global Search dropdown state (you can add actual menu items later)
    const [showGlobalMenu, setShowGlobalMenu] = useState(false)

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
                        <button className="header-btn notification-btn" title="Notifications">
                            <NotificationsActiveIcon sx={{ fontSize: 22 , color: colors.primary }} />
                            <span className="notification-badge">13</span>
                        </button>

                        <button className="header-btn add-btn" title="Add">
                            <AddIcon sx={{ fontSize: 22 , color: colors.primary }} />
                        </button>

                        <button className="header-btn phone-btn" title="Phone">
                            <PhoneIcon sx={{ fontSize: 22 , color: colors.primary }} />
                        </button>
                    </div>
                    <div style={{display:'flex' , gap:'5px'}}>
                    <div className="timer">{formatTime(timeLeft)}</div>
                       <button className="header-btn user-btn" title="User Profile">
                            <AccountCircleIcon sx={{ fontSize: 40 }} />
                        </button>
                    </div>
                </div>

            </div>

        </header>
    )
}

export default Header