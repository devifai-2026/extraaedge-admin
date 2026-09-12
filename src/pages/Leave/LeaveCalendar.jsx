// Leave Calendar — one month, every person, who is away when.
//
// A month grid rather than a list: the question this answers is "can I run the
// team on the 14th?", which a list of date ranges cannot show at a glance.
// Holidays are drawn as full columns because they apply to everybody.
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Snackbar, Alert, Select, MenuItem } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import { leaveApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton, Btn } from '../../lib/lmsUi';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const iso = (y, m, day) => `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();

// A leave row covers a day if the day falls inside its inclusive range.
const covers = (r, day) => String(r.from_date).slice(0, 10) <= day && String(r.to_date).slice(0, 10) >= day;

const CELL = { approved: { bg: '#dcfce7', fg: '#166534', ch: '●' },
  pending: { bg: '#fef3c7', fg: '#92400e', ch: '○' },
  holiday: { bg: '#e0e7ff', fg: '#3730a3', ch: 'H' },
  weekend: { bg: '#f8fafc', fg: '#cbd5e1', ch: '' } };

export default function LeaveCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [rows, setRows] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const from = iso(year, month, 1);
  const to = iso(year, month, daysIn(year, month));

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      leaveApi.calendar({ from, to }).catch((e) => { setToast({ severity: 'error', text: e.message }); return { data: [] }; }),
      leaveApi.holidays({ from, to }).catch(() => ({ data: [] })),
    ]).then(([l, h]) => { setRows(l?.data || []); setHolidays(h?.data || []); })
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const n = daysIn(year, month);
  const days = useMemo(() => Array.from({ length: n }, (_, i) => i + 1), [n]);
  const holidaySet = useMemo(() => new Set((holidays || []).map((h) => String(h.date || h.holiday_date).slice(0, 10))), [holidays]);

  // Group by person: one row per employee who has anything this month.
  const people = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!['approved', 'pending'].includes(r.status)) continue;
      if (!map.has(r.user_id)) map.set(r.user_id, { id: r.user_id, name: r.user_name, role: r.user_role, items: [] });
      map.get(r.user_id).items.push(r);
    }
    return [...map.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [rows]);

  const shift = (delta) => {
    const m = month + delta;
    if (m < 0) { setMonth(11); setYear((y) => y - 1); }
    else if (m > 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth(m);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Leave Calendar"
        subtitle="Who is away this month, across every role."
        icon={CalendarMonthIcon}
        right={(
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Btn variant="ghost" size="sm" onClick={() => shift(-1)}>‹</Btn>
            <Select size="small" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((mm, i) => <MenuItem key={mm} value={i}>{mm}</MenuItem>)}
            </Select>
            <Select size="small" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
            <Btn variant="ghost" size="sm" onClick={() => shift(1)}>›</Btn>
          </div>
        )}
      />

      <div style={{ display: 'flex', gap: 14, margin: '0 0 12px', fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
        <span><span style={{ background: CELL.approved.bg, color: CELL.approved.fg, padding: '1px 7px', borderRadius: 5 }}>●</span> Approved</span>
        <span><span style={{ background: CELL.pending.bg, color: CELL.pending.fg, padding: '1px 7px', borderRadius: 5 }}>○</span> Pending</span>
        <span><span style={{ background: CELL.holiday.bg, color: CELL.holiday.fg, padding: '1px 7px', borderRadius: 5 }}>H</span> Holiday</span>
      </div>

      {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : people.length === 0 ? (
          <Card><EmptyState icon="🏖️" title="Nobody is away this month" text={`No approved or pending leave between ${from} and ${to}.`} /></Card>
        ) : (
          <Card pad={0}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#fafbfc' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', position: 'sticky', left: 0, background: '#fafbfc', minWidth: 190 }}>Employee</th>
                    {days.map((day) => {
                      const dISO = iso(year, month, day);
                      const dow = new Date(`${dISO}T00:00:00Z`).getUTCDay();
                      const isHol = holidaySet.has(dISO);
                      return (
                        <th key={day} title={isHol ? 'Holiday' : ''} style={{
                          padding: '8px 0', width: 26, textAlign: 'center', fontWeight: 600,
                          color: isHol ? CELL.holiday.fg : (dow === 0 || dow === 6) ? '#cbd5e1' : '#475569',
                          background: isHol ? CELL.holiday.bg : 'transparent',
                        }}>{day}</th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #eef2f7' }}>
                      <td style={{ padding: '8px 12px', position: 'sticky', left: 0, background: '#fff', whiteSpace: 'nowrap' }}>
                        {p.name} <span style={{ color: '#94a3b8', fontSize: 12 }}>· {p.role}</span>
                      </td>
                      {days.map((day) => {
                        const dISO = iso(year, month, day);
                        const hit = p.items.find((r) => covers(r, dISO));
                        const isHol = holidaySet.has(dISO);
                        const dow = new Date(`${dISO}T00:00:00Z`).getUTCDay();
                        const style = hit ? CELL[hit.status] : isHol ? CELL.holiday : (dow === 0 || dow === 6) ? CELL.weekend : null;
                        return (
                          <td key={day}
                            title={hit ? `${hit.type_name || 'Leave'} · ${hit.status}${Number(hit.lop_days) > 0 ? ` · ${Number(hit.lop_days)}d unpaid` : ''}` : isHol ? 'Holiday' : ''}
                            style={{ textAlign: 'center', padding: '6px 0', background: style?.bg || 'transparent', color: style?.fg || '#e2e8f0' }}>
                            {hit ? CELL[hit.status].ch : isHol ? 'H' : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      {holidays.length > 0 && (
        <Card style={{ marginTop: 16 }} title="Holidays this month">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {holidays.map((h) => (
              <Badge key={h.id || `${h.date}${h.name}`} tone="info">
                {String(h.date || h.holiday_date).slice(0, 10).split('-').reverse().join('/')} · {h.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity || 'info'} onClose={() => setToast(null)}>{toast?.text}</Alert>
      </Snackbar>
    </Box>
  );
}
