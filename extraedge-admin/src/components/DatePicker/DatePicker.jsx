import { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { colors } from '../../theme/colors';
import {
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfToday,
  eachDayOfInterval,
  format,
  isSameDay,
  isWithinInterval,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

const DateRangePicker = ({ onApply, primaryColor = colors.primary }) => {
  const today = startOfToday();
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeTab, setActiveTab] = useState('custom');
  const [currentMonth, setCurrentMonth] = useState(today);
  const [isOpen, setIsOpen] = useState(false);
  const nextMonth = addMonths(currentMonth, 1);

  const setRange = (start, end, tabId) => {
    setStartDate(start);
    setEndDate(end);
    setActiveTab(tabId);
  };

  const handleTabChange = (event, newTab) => {
    if (newTab === null) return;
    switch (newTab) {
      case 'today':
        setRange(today, today, 'today');
        break;
      case 'thisWeek': {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        setRange(weekStart, weekEnd, 'thisWeek');
        break;
      }
      case 'lastWeek': {
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        setRange(lastWeekStart, lastWeekEnd, 'lastWeek');
        break;
      }
      case 'last30Days':
        setRange(subDays(today, 29), today, 'last30Days');
        break;
      case 'last90Days':
        setRange(subDays(today, 89), today, 'last90Days');
        break;
      case 'allDates':
        setRange(null, null, 'allDates');
        break;
      case 'custom':
        setRange(startDate, endDate, 'custom');
        break;
      default:
        break;
    }
  };

  const handleDateClick = (date) => {
    if (activeTab !== 'custom') setActiveTab('custom');
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (date >= startDate) setEndDate(date);
      else {
        setStartDate(date);
        setEndDate(startDate);
      }
    }
  };

  const isInRange = (date) => {
    if (!startDate) return false;
    if (startDate && !endDate) return isSameDay(date, startDate);
    if (startDate && endDate) {
      return isWithinInterval(date, { start: startDate, end: endDate });
    }
    return false;
  };

  const isStartOrEnd = (date) => {
    return (startDate && isSameDay(date, startDate)) || (endDate && isSameDay(date, endDate));
  };

  const getDaysInMonth = (monthDate) => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    setActiveTab('custom');
  };

  const handleApply = () => {
    if (onApply) onApply({ startDate, endDate, rangeType: activeTab });
    setIsOpen(false);
  };

  const renderCalendar = (monthDate) => {
    const days = getDaysInMonth(monthDate);
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <Box sx={{ flex: 1, minWidth: 280 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <IconButton size="small" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            ←
          </IconButton>
          <Typography variant="subtitle1">{format(monthDate, 'MMMM yyyy')}</Typography>
          <IconButton size="small" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            →
          </IconButton>
        </Box>
        <Grid container columns={7} sx={{ textAlign: 'center', mb: 1 }}>
          {weekDays.map((day) => (
            <Grid item xs={1} key={day}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Grid container columns={7} spacing={0.5}>
          {days.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === monthDate.getMonth();
            const isSelected = isInRange(day);
            const isEdge = isStartOrEnd(day);
            return (
              <Grid item xs={1} key={idx}>
                <Button
                  onClick={() => handleDateClick(day)}
                  sx={{
                    minWidth: 36,
                    height: 36,
                    p: 0,
                    borderRadius: '4px',
                    backgroundColor: isEdge
                      ? primaryColor
                      : isSelected
                      ? colors.primaryLight
                      : 'transparent',
                    color: isEdge ? colors.white : isCurrentMonth ? 'inherit' : colors.scrollGrey,
                    '&:hover': { backgroundColor: colors.hoverGrey },
                  }}
                >
                  {format(day, 'd')}
                </Button>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  const tabOptions = [
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'last30Days', label: 'Last 30 Days' },
    { value: 'last90Days', label: 'Last 90 Days' },
    { value: 'allDates', label: 'All Dates' },
    { value: 'custom', label: 'Custom Dates' },
  ];

  const calendarContent = (
    <Box>
      <ToggleButtonGroup
        value={activeTab}
        exclusive
        onChange={handleTabChange}
        sx={{ flexWrap: 'wrap', mb: 2 }}
      >
        {tabOptions.map((tab) => (
          <ToggleButton key={tab.value} value={tab.value} size="small">
            {tab.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
        {renderCalendar(currentMonth)}
        {renderCalendar(nextMonth)}
      </Box>
    </Box>
  );

  return (
    <Box>
      <Button
        variant="contained"
        onClick={() => setIsOpen(true)}
        style={{height: "54px"}}
      >
        Select Date Range
      </Button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Select Date Range</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {calendarContent}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleReset}>
            RESET
          </Button>
          <Button
            variant="outlined"
            onClick={() => setIsOpen(false)}
          >
            CANCEL
          </Button>
          <Button variant="contained" onClick={handleApply} sx={{ bgcolor: primaryColor }}>
            APPLY
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DateRangePicker;