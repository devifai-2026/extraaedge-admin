// Surfaces the three "extra suggestion" anomaly checks from the staff
// monitoring initiative: concurrent sessions, first-time devices, and
// login-location anomalies vs a user's own baseline. Heuristics for review,
// not proof of anything — worded that way deliberately. super_admin only.
import { useEffect, useState } from 'react';
import { Box, Typography, Chip, Collapse, IconButton } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { analyticsApi, auth } from '../../lib/endpoints';
import { ROLES } from '../../lib/rbac';

const Row = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, fontSize: 13, flexWrap: 'wrap' }}>{children}</Box>
);

export default function SecurityAnomaliesBanner() {
  const user = auth.getUser();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user?.role !== ROLES.SUPER_ADMIN) return;
    let alive = true;
    analyticsApi.securityAnomalies()
      .then((r) => { if (alive) setData(r?.data || null); })
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [user?.role]);

  if (user?.role !== ROLES.SUPER_ADMIN || !data) return null;

  const total = (data.concurrent_sessions?.length || 0) + (data.new_devices?.length || 0) + (data.location_anomalies?.length || 0);
  if (total === 0) return null;

  return (
    <Box sx={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 1.5, mb: 2, px: 2, py: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => setOpen((v) => !v)}>
        <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
        <Typography sx={{ fontWeight: 700, fontSize: 14, flex: 1 }}>
          {total} security anomal{total === 1 ? 'y' : 'ies'} to review
        </Typography>
        <IconButton size="small">{open ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 1, pl: 0.5 }}>
          {data.concurrent_sessions?.map((r, i) => (
            <Row key={`c${i}`}>
              <Chip size="small" label="Concurrent sessions" sx={{ height: 20, fontSize: 11, background: '#fdecea', color: '#c62828' }} />
              <b>{r.user_name}</b> ({r.user_role}) — {r.active_sessions} active sessions from {r.distinct_ips} different IPs: {r.ips?.join(', ')}
            </Row>
          ))}
          {data.new_devices?.map((r, i) => (
            <Row key={`d${i}`}>
              <Chip size="small" label="New device" sx={{ height: 20, fontSize: 11, background: '#e3f2fd', color: '#1565c0' }} />
              <b>{r.user_name}</b> ({r.user_role}) — first time seen from this browser/device, {new Date(r.issued_at).toLocaleString()}
            </Row>
          ))}
          {data.location_anomalies?.map((r, i) => (
            <Row key={`l${i}`}>
              <Chip size="small" label="Unusual location" sx={{ height: 20, fontSize: 11, background: '#f3e5f5', color: '#6a1b9a' }} />
              <b>{r.user_name}</b> ({r.user_role}) — logged in from {r.geo_city ? `${r.geo_city}, ` : ''}{r.geo_country}, usually {r.usual_country}
            </Row>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
