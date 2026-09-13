// Leave Calendar — a real month grid: who is away, on which day.
//
// Laid out as weeks (Sun..Sat) rather than a person-per-row matrix, because the
// question people actually ask is "who is out on the 14th?" — a date-first
// question deserves a date-first layout. Each day cell lists the people away
// that day; a holiday tints the whole cell, since it applies to everyone.
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Snackbar, Alert, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import { leaveApi } from '../../lib/endpoints';
import { PageHeader, Card, Skeleton, Btn, Badge } from '../../lib/lmsUi';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const iso = (y, m, day) => `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
const covers = (r, day) => String(r.from_date).slice(0, 10) <= day && String(r.to_date).slice(0, 10) >= day;
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// A stable colour per person, so the same face keeps the same chip all month.
const TINTS = [
  ['#dcfce7', '#166534'], ['#dbeafe', '#1e40af'], ['#fae8ff', '#86198f'],
  ['#ffedd5', '#9a3412'], ['#cffafe', '#155e75'], ['#fef9c3', '#854d0e'],
  ['#e0e7ff', '#3730a3'], ['#fee2e2', '#991b1b'],
];
const tintFor = (id) => {
  let h = 0;
  for (let i = 0; i < String(id).length; i += 1) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
};

export default function LeaveCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [rows, setRows] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [dayOpen, setDayOpen] = useState(null);

  const from = iso(year, month, 1);
  const to = iso(year, month, daysIn(year, month));

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      leaveApi.calendar({ from, to }),
      // Holidays are decoration: if that call fails the calendar is still
      // useful, so it degrades to an empty list rather than failing the page.
      leaveApi.holidays({ from, to }).catch(() => ({ data: [] })),
    ])
      .then(([l, h]) => { setRows(l?.data || []); setHolidays(h?.data || []); })
      .catch((e) => { setRows([]); setToast({ severity: 'error', text: e.message }); })
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const holidayByDate = useMemo(() => {
    const map = new Map();
    for (const h of holidays || []) map.set(String(h.date || h.holiday_date).slice(0, 10), h);
    return map;
  }, [holidays]);

  // Leading blanks so day 1 lands under its weekday, then every day of the month.
  const cells = useMemo(() => {
    const lead = new Date(year, month, 1).getDay();
    const n = daysIn(year, month);
    return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
  }, [year, month]);

  const peopleOn = useCallback(
    (dISO) => (rows || []).filter((r) => covers(r, dISO)),
    [rows],
  );

  const shift = (delta) => {
    const m = month + delta;
    if (m < 0) { setMonth(11); setYear((y) => y - 1); }
    else if (m > 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth(m);
  };

  const todayISO = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const awayCount = new Set((rows || []).map((r) => r.user_id)).size;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <PageHeader
        title="Leave Calendar"
        subtitle={loading ? 'Loading…'
          : awayCount ? `${awayCount} ${awayCount === 1 ? 'person is' : 'people are'} away this month`
            : 'Nobody is away this month'}
        icon={CalendarMonthIcon}
        right={(
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select size="small" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((mm, i) => <MenuItem key={mm} value={i}>{mm}</MenuItem>)}
            </Select>
            <Select size="small" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </div>
        )}
      />

      <Card pad={0}>
        {/* month header + arrows, mirroring a familiar calendar control */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
          <Btn variant="ghost" size="sm" onClick={() => shift(-1)}>‹</Btn>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{MONTHS[month]} {year}</div>
          <Btn variant="ghost" size="sm" onClick={() => shift(1)}>›</Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 12px 6px' }}>
          {DOW.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#94a3b8', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton h={90} /><div style={{ height: 8 }} /><Skeleton h={90} /><div style={{ height: 8 }} /><Skeleton h={90} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, padding: '0 12px 14px' }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`blank-${i}`} />;
              const dISO = iso(year, month, day);
              const hol = holidayByDate.get(dISO);
              const away = peopleOn(dISO);
              const isToday = dISO === todayISO;
              const dow = new Date(`${dISO}T00:00:00Z`).getUTCDay();
              const weekend = dow === 0 || dow === 6;
              return (
                <div
                  key={dISO}
                  onClick={() => (away.length || hol) && setDayOpen({ dISO, day, away, hol })}
                  title={hol ? hol.name : undefined}
                  style={{
                    minHeight: 96,
                    border: isToday ? '2px solid #0f172a' : '1px solid #e8ecf3',
                    borderRadius: 10,
                    padding: 8,
                    background: hol ? '#eef2ff' : weekend ? '#fafbfc' : '#fff',
                    cursor: (away.length || hol) ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column', gap: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {hol && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#3730a3', textTransform: 'uppercase', letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {hol.name}
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: weekend && !hol ? '#cbd5e1' : '#334155' }}>{day}</span>
                  </div>

                  {/* Up to three people, then a "+N" so a busy day stays readable. */}
                  {away.slice(0, 3).map((r) => {
                    const [bg, fg] = tintFor(r.user_id);
                    return (
                      <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', gap: 4, background: bg, color: fg,
                        borderRadius: 6, padding: '2px 5px', fontSize: 11, fontWeight: 600,
                        opacity: r.status === 'pending' ? 0.65 : 1,
                        border: r.status === 'pending' ? `1px dashed ${fg}` : '1px solid transparent',
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.user_name}
                        </span>
                      </div>
                    );
                  })}
                  {away.length > 3 && (
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>+{away.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
        <span><span style={{ background: '#dcfce7', color: '#166534', padding: '1px 8px', borderRadius: 6, fontWeight: 600 }}>Name</span> Approved</span>
        <span><span style={{ background: '#dcfce7', color: '#166534', padding: '1px 8px', borderRadius: 6, border: '1px dashed #166534', fontWeight: 600, opacity: 0.65 }}>Name</span> Pending</span>
        <span><span style={{ background: '#eef2ff', color: '#3730a3', padding: '1px 8px', borderRadius: 6, fontWeight: 700 }}>Tinted</span> Holiday</span>
      </div>

      {/* Day detail: the full list, since a cell only shows the first three. */}
      <Dialog open={!!dayOpen} onClose={() => setDayOpen(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {dayOpen ? `${MONTHS[month]} ${dayOpen.day}, ${year}` : ''}
          {dayOpen?.hol && <> · <span style={{ color: '#3730a3', fontSize: 15 }}>{dayOpen.hol.name}</span></>}
        </DialogTitle>
        <DialogContent>
          {dayOpen?.away?.length ? dayOpen.away.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
              <span style={{
                width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: tintFor(r.user_id)[0], color: tintFor(r.user_id)[1], fontSize: 11, fontWeight: 700, flex: '0 0 auto',
              }}>{initials(r.user_name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>{r.user_name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {r.user_role}{r.type_name ? ` · ${r.type_name}` : ''}{r.half_day ? ' · half day' : ''}
                </div>
              </div>
              <Badge tone={r.status === 'approved' ? 'success' : 'warn'}>{r.status}</Badge>
            </div>
          )) : <div style={{ fontSize: 14, color: '#64748b', padding: '8px 0' }}>Nobody is on leave this day.</div>}
        </DialogContent>
        <DialogActions><Btn variant="ghost" onClick={() => setDayOpen(null)}>Close</Btn></DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity || 'info'} onClose={() => setToast(null)}>{toast?.text}</Alert>
      </Snackbar>
    </Box>
  );
}
