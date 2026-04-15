import React, { useState, useMemo } from "react";
import { IconButton, Box } from "@mui/material";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CallIcon from "@mui/icons-material/Call";
import ChatIcon from "@mui/icons-material/Chat";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import SmsIcon from "@mui/icons-material/Sms";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LeadCard from "../../components/LeadCard/LeadCard";
import { colors } from "../../theme/colors";
import "./FollowUpManager.css";

// Mock followup data with stage info and dates
const followupLeads = [
  {
    id: 1,
    name: "Nikhil Pr...",
    phone: "9881874904",
    status: "12-Cold",
    subStatus: "Not Interested, got job",
    value: "",
    personal: {
      program: "Data Analyst Training and Certification",
      country: "India",
      state: "Maharashtra",
      district: "Pune",
      city: "Pune",
      leadAddedOn: "Jan 20, 2026 10:47 AM",
      lastUpdatedOn: "Apr 7, 2026 3:58 PM",
      previousLeadOwner: "Nikita Nagle",
      currentLeadOwner: "Divya Nair",
      leadAge: "80 Days",
    },
    source: [
      { channel: "Direct", source: "Website", campaign: "ORGANIC", medium: "Free" },
    ],
    followup: {
      scheduledOn: "",
      remarks: "plan changed for 2-3 ...",
      stage: "12-Cold",
      subStage: "Not Interested, got job",
    },
    followupDate: "2026-04-21",
    followupType: "done",
  },
  {
    id: 2,
    name: "Aarav Singh",
    phone: "9876543210",
    status: "08-Interested",
    subStatus: "Awaiting confirmation",
    value: "",
    personal: {
      program: "Advanced Python Development",
      country: "India",
      state: "Maharashtra",
      district: "Pune",
      city: "Pune",
      leadAddedOn: "Feb 15, 2026 2:30 PM",
      lastUpdatedOn: "Apr 5, 2026 5:15 PM",
      previousLeadOwner: "Rajesh Kumar",
      currentLeadOwner: "Priya Sharma",
      leadAge: "55 Days",
    },
    source: [
      { channel: "Facebook", source: "Social Media", campaign: "PAID", medium: "CPC" },
    ],
    followup: {
      scheduledOn: "Apr 15, 2026 3:00 PM",
      remarks: "Contact regarding course fees and batch timings",
      stage: "08-Interested",
      subStage: "Awaiting confirmation",
    },
    followupDate: "2026-04-15",
    followupType: "planned",
  },
  {
    id: 3,
    name: "Sneha Desai",
    phone: "9123456789",
    status: "10-Enrolled",
    subStatus: "Active student",
    value: "",
    personal: {
      program: "Full Stack Web Development",
      country: "India",
      state: "Karnataka",
      district: "Bangalore",
      city: "Bangalore",
      leadAddedOn: "Dec 10, 2025 11:20 AM",
      lastUpdatedOn: "Apr 8, 2026 9:45 AM",
      previousLeadOwner: "Amit Patel",
      currentLeadOwner: "Neha Gupta",
      leadAge: "122 Days",
    },
    source: [
      { channel: "LinkedIn", source: "Professional Network", campaign: "ORGANIC", medium: "Referral" },
    ],
    followup: {
      scheduledOn: "Apr 10, 2026 10:00 AM",
      remarks: "Course progress review and assignment submission",
      stage: "10-Enrolled",
      subStage: "Active student",
    },
    followupDate: "2026-04-10",
    followupType: "missed",
  },
  {
    id: 4,
    name: "Rohit Verma",
    phone: "9555666777",
    status: "05-Qualified",
    subStatus: "Negotiation phase",
    value: "Untouched",
    personal: {
      program: "Data Science with ML",
      country: "India",
      state: "Delhi",
      district: "Central Delhi",
      city: "New Delhi",
      leadAddedOn: "Mar 1, 2026 8:15 AM",
      lastUpdatedOn: "Apr 6, 2026 4:20 PM",
      previousLeadOwner: "Vikram Singh",
      currentLeadOwner: "Anjali Verma",
      leadAge: "41 Days",
    },
    source: [
      { channel: "Google Ads", source: "Search Engine", campaign: "PAID", medium: "CPC" },
    ],
    followup: {
      scheduledOn: "Apr 22, 2026 2:30 PM",
      remarks: "Follow up on EMI options and scholarship eligibility",
      stage: "05-Qualified",
      subStage: "Negotiation phase",
    },
    followupDate: "2026-04-22",
    followupType: "planned",
  },
];

const TABS = [
  { key: "all", label: "All" },
  { key: "done", label: "Done Followups", color: colors.success },
  { key: "missed", label: "Missed Followups", color: colors.error },
  { key: "planned", label: "Planned Followups", color: colors.primary },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function FollowupCalendar({ selectedDate, onDateSelect, eventDates }) {
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectedStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  return (
    <div className="followup-calendar">
      <div className="calendar-title">
        <span className="calendar-icon">
          <CalendarMonthIcon />
        </span>
        Followup Calendar
      </div>
      <div className="calendar-nav">
        <IconButton size="small" onClick={prevMonth}>
          <ChevronLeftIcon />
        </IconButton>
        <select
          className="calendar-month-select"
          value={viewMonth}
          onChange={(e) => setViewMonth(Number(e.target.value))}
        >
          {MONTH_NAMES.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          className="calendar-year-select"
          value={viewYear}
          onChange={(e) => setViewYear(Number(e.target.value))}
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <IconButton size="small" onClick={nextMonth}>
          <ChevronRightIcon />
        </IconButton>
      </div>

      <div className="calendar-grid">
        {DAY_LABELS.map((d) => (
          <div key={d} className={`calendar-day-label ${d === "Su" ? "sunday" : ""} ${d === "Sa" ? "saturday" : ""}`}>
            {d}
          </div>
        ))}
        {calendarDays.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="calendar-cell empty" />;

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const hasEvent = eventDates.has(dateStr);
          const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
          const isSaturday = dayOfWeek === 6;

          return (
            <div
              key={day}
              className={`calendar-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${hasEvent ? "has-event" : ""} ${isSaturday ? "saturday" : ""}`}
              onClick={() => onDateSelect(new Date(viewYear, viewMonth, day))}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function FollowUpManager() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateStr = toDateStr(selectedDate);

  const eventDates = useMemo(() => {
    return new Set(followupLeads.map((l) => l.followupDate));
  }, []);

  // Leads for the selected date
  const leadsForDate = useMemo(() => {
    return followupLeads.filter((l) => l.followupDate === selectedDateStr);
  }, [selectedDateStr]);

  // Further filter by active tab
  const filteredLeads = useMemo(() => {
    if (activeTab === "all") return leadsForDate;
    return leadsForDate.filter((l) => l.followupType === activeTab);
  }, [activeTab, leadsForDate]);

  // Tab counts based on the selected date's leads
  const tabCounts = useMemo(() => {
    const counts = { all: leadsForDate.length, done: 0, missed: 0, planned: 0 };
    leadsForDate.forEach((l) => {
      if (counts[l.followupType] !== undefined) counts[l.followupType]++;
    });
    return counts;
  }, [leadsForDate]);

  return (
    <div className="followup-manager">
      {/* Left: Main content */}
      <div className="followup-main">
        {/* Header badge */}
        <div className="followup-header-badge">
          Followups ({tabCounts.all})
        </div>

        {/* Tabs */}
        <div className="followup-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`followup-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              style={{
                color: tab.color || (activeTab === tab.key ? colors.primary : colors.textSecondary),
                borderBottom: activeTab === tab.key ? `2px solid ${tab.color || colors.primary}` : "2px solid transparent",
              }}
            >
              {tab.label} ({tabCounts[tab.key]})
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="followup-toolbar">
          <IconButton size="small">
            <SwapVertIcon sx={{ color: colors.primary }} />
          </IconButton>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton size="small">
              <RefreshIcon sx={{ color: colors.primary }} />
            </IconButton>
            <IconButton size="small">
              <FilterAltIcon sx={{ color: colors.primary }} />
            </IconButton>
          </Box>
        </div>

        {/* Lead Cards or Empty State */}
        <div className="followup-cards-area">
          {filteredLeads.length === 0 ? (
            <div className="followup-empty">
              <img
                src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png"
                alt="No leads"
                className="followup-empty-img"
              />
              <h3 className="followup-empty-title">No Leads found</h3>
              <p className="followup-empty-text">
                It looks like there are no follow-ups added yet
              </p>
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))
          )}
        </div>
      </div>

      {/* Right: Calendar sidebar */}
      <div className="followup-right-sidebar">
        <FollowupCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          eventDates={eventDates}
        />
      </div>
    </div>
  );
}

export default FollowUpManager;
