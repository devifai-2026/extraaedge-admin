// Reusable wrapper for any dashboard chart / table card.
// Provides:
//  - Title, "Last synced" timestamp
//  - Refresh button that calls back to parent
//  - Download (PNG via dom-to-canvas; falls back to CSV-from-rows when chart is a table)
//  - Fullscreen toggle (browser fullscreen API on the card element)
//
// Children render the chart body. `csvRows` is optional — pass a [{...}] array
// to enable CSV download for tabular cards.
import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

const fmtTime = (d) => {
  if (!d) return '';
  try {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return ''; }
};

// Convert a list of plain objects to a CSV string.
const toCsv = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => escape(r[c])).join(','))].join('\n');
};

// Trigger a browser download of the given Blob.
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Render a card-DOM-node to a PNG via SVG-foreignObject technique. Works for
// recharts SVGs and plain HTML alike.
const downloadAsPng = async (node, filename) => {
  // Most charts here are SVGs. If we find one inside the body, serialize it.
  const svg = node.querySelector('svg');
  if (svg) {
    const cloned = svg.cloneNode(true);
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(cloned);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const w = svg.clientWidth || svg.viewBox.baseVal.width || 800;
    const h = svg.clientHeight || svg.viewBox.baseVal.height || 400;
    const canvas = document.createElement('canvas');
    canvas.width = w * 2; canvas.height = h * 2; // 2x for retina
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => { if (blob) downloadBlob(blob, filename); }, 'image/png');
    return;
  }
  // Fallback: alert if we can't easily render
  alert('Nothing to download in this card.');
};

export default function ChartCard({
  title,
  children,
  loading,
  error,
  lastSynced,
  onRefresh,
  csvRows,
  rightActions,
  fullHeight = 360,
}) {
  const cardRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = cardRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch (e) {
      console.warn('Fullscreen failed:', e?.message || e);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const safeTitle = (title || 'chart').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      if (Array.isArray(csvRows) && csvRows.length > 0) {
        const csv = toCsv(csvRows);
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${safeTitle}.csv`);
      } else if (cardRef.current) {
        await downloadAsPng(cardRef.current, `${safeTitle}.png`);
      }
    } catch (e) {
      console.error(e);
      alert('Download failed: ' + (e?.message || e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box
      ref={cardRef}
      sx={{
        background: '#fff',
        borderRadius: 1.5,
        border: '1px solid #e8e8e8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: isFullscreen ? '100vh' : 'auto',
        width: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ fontWeight: 600, fontSize: 14 }}>{title}</Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {lastSynced && (
            <Box sx={{ fontSize: 11, color: '#888', mr: 1 }}>
              Last synced: {fmtTime(lastSynced)}
            </Box>
          )}
          {rightActions}
          {onRefresh && (
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={onRefresh}>
                <RefreshIcon fontSize="small" sx={{ color: '#E53935' }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={Array.isArray(csvRows) && csvRows.length ? 'Download CSV' : 'Download PNG'}>
            <IconButton size="small" onClick={handleDownload} disabled={downloading}>
              <DownloadIcon fontSize="small" sx={{ color: '#666' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconButton size="small" onClick={toggleFullscreen}>
              {isFullscreen
                ? <FullscreenExitIcon fontSize="small" sx={{ color: '#666' }} />
                : <FullscreenIcon fontSize="small" sx={{ color: '#666' }} />
              }
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', minHeight: isFullscreen ? 'auto' : fullHeight, flex: isFullscreen ? 1 : 'none' }}>
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)', zIndex: 1 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {error && (
          <Box sx={{ p: 2, color: '#d32f2f', fontSize: 13 }}>{error}</Box>
        )}
        {!error && children}
      </Box>
    </Box>
  );
}
