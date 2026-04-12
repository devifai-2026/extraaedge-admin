import Autocomplete from '@mui/material/Autocomplete';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
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

function AnalyticsDashboard() {
    const Counselors = [
        { id: 1, counselor: 'Divya Nair' },
        { id: 2, counselor: 'James Mitchell' },
        { id: 3, counselor: 'Sarah Johnson' }
    ];

    const handleDateRangeApply = (range) => {
        console.log('Selected date range:', range);
        // Here you can filter dashboard data based on the range
    };

    return (
        <>
            <div className='first-container'>
                <div>
                    <h2>Analytics Dashboard</h2>
                </div>
                <div className='first-container-rightside-contain'>
                    <button className="dashboard-button">Dashboard Index</button>
                    <Divider orientation="vertical" />
                    <SettingsIcon sx={{ fontSize: 35 }} />
                    <RefreshIcon sx={{ fontSize: 35 }} />
                </div>
            </div>
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', marginTop: '10px' }}>
                <div>
                    <FilterAltIcon sx={{ fontSize: 30, color: colors.primary }} />
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
                        <RefreshIcon className='icon_analytics' />
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
                        <RefreshIcon className='icon_analytics' />
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
        </>
    );
}

export default AnalyticsDashboard;