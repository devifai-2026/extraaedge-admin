// Duplicate leads — find and merge.
//
// super_admin / branch_manager see the whole tenant / their branch.
// counsellor / telecaller see ONLY groups where they own every lead — merging
// someone else's lead into your own would be a silent reassignment the other
// owner never sees, so those groups are withheld and left to a manager. The
// server enforces that on the merge endpoint too, not just in the scan filter.
//
// Two ways in:
//   • Scan — group live leads by contact (phone AND whatsapp, normalised) or
//     by name. Contact is reliable; name is a suggestion, because two real
//     people genuinely share a name.
//   • Search — type a number or name, tick the rows that are the same person,
//     merge them. For the cases a scan cannot infer.
//
// Merging keeps ONE lead and soft-deletes the rest. Every activity, note,
// follow-up, call and payment moves to the survivor, and blank contact fields
// on the survivor are filled from the others — the usual reason two rows exist
// is that one has the number in `phone` and the other in `whatsapp_number`.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, TextField, MenuItem, Chip, Radio, Checkbox, Snackbar, Alert,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
} from '@mui/material';
import MergeTypeIcon from '@mui/icons-material/MergeTypeOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { duplicatesApi, leadsApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, lmsTokens } from '../../lib/lmsUi';
import { isLeadOwnerRole } from '../../lib/rbac';

const { INK, MUTE, FAINT, LINE } = lmsTokens;

const fmtDate = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch { return '—'; }
};

// One lead inside a group. The radio picks the survivor; everything else in
// the group is merged into it.
const LeadRow = ({ lead, survivorId, onPick, showPick = true }) => (
  <Box
    sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.2, px: 1.5,
      borderBottom: `1px solid ${LINE}`,
      background: survivorId === lead.id ? 'rgba(5,150,105,0.06)' : 'transparent',
    }}
  >
    {showPick && (
      <Radio
        size="small" checked={survivorId === lead.id}
        onChange={() => onPick(lead.id)}
        sx={{ mt: -0.4 }}
      />
    )}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 13.5, color: INK }}>{lead.name || '(no name)'}</span>
        {lead.stage_name && (
          <Chip size="small" label={lead.stage_name} sx={{ height: 19, fontSize: 10.5 }} />
        )}
        {survivorId === lead.id && (
          <Chip
            size="small" label="KEEP"
            sx={{
              height: 19, fontSize: 10, fontWeight: 800, color: '#059669',
              background: 'rgba(5,150,105,0.14)',
            }}
          />
        )}
      </Box>
      <div style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>
        {lead.phone && <>📞 {lead.phone} </>}
        {lead.whatsapp_number && <>· WA {lead.whatsapp_number} </>}
        {lead.email && <>· {lead.email}</>}
      </div>
      <div style={{ fontSize: 11.5, color: FAINT, marginTop: 2 }}>
        Created {fmtDate(lead.created_at)}
        {lead.owner_name ? ` · ${lead.owner_name}` : ''}
        {` · ${lead.activity_count ?? 0} activities`}
        {lead.converted_at ? ' · CONVERTED' : ''}
      </div>
    </Box>
  </Box>
);

export default function Duplicates() {
  // Front line sees a narrower page: the server only returns groups where they
  // own EVERY lead. Saying so up front stops an empty result reading as a bug.
  const ownerScoped = isLeadOwnerRole();
  const [tab, setTab] = useState('scan');
  const [mode, setMode] = useState('contact');
  const [groups, setGroups] = useState([]);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  // survivor per group, keyed by the group's match value
  const [survivors, setSurvivors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [merging, setMerging] = useState(false);

  // --- manual search ---
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [searchSurvivor, setSearchSurvivor] = useState('');
  const [searching, setSearching] = useState(false);

  const runScan = useCallback(async () => {
    setLoading(true); setScanned(false);
    try {
      const r = await duplicatesApi.scan({ mode, limit: 200 });
      const g = r?.data || [];
      setGroups(g);
      // Default the survivor to the OLDEST lead in each group — it is the one
      // counsellors have worked longest, and the server returns them sorted.
      setSurvivors(Object.fromEntries(g.map((x) => [x.match_value, x.leads[0]?.id])));
      setScanned(true);
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Scan failed' });
    } finally { setLoading(false); }
  }, [mode]);

  useEffect(() => { setGroups([]); setScanned(false); }, [mode]);

  const doSearch = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const r = await leadsApi.list({ q: q.trim(), limit: 50 });
      const rows = r?.data || [];
      setResults(rows);
      setPicked(new Set());
      setSearchSurvivor(rows[0]?.id || '');
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Search failed' });
    } finally { setSearching(false); }
  };

  const mergeGroup = async (group) => {
    const survivorId = survivors[group.match_value];
    const mergeIds = group.leads.map((l) => l.id).filter((id) => id !== survivorId);
    setMerging(true);
    try {
      await duplicatesApi.mergeMany({ survivor_id: survivorId, merge_ids: mergeIds });
      setGroups((prev) => prev.filter((g) => g.match_value !== group.match_value));
      setToast({ severity: 'success', text: `Merged ${mergeIds.length} lead(s)` });
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Merge failed' });
    } finally { setMerging(false); setConfirm(null); }
  };

  const mergeSearch = async () => {
    const mergeIds = [...picked].filter((id) => id !== searchSurvivor);
    setMerging(true);
    try {
      await duplicatesApi.mergeMany({ survivor_id: searchSurvivor, merge_ids: mergeIds });
      setToast({ severity: 'success', text: `Merged ${mergeIds.length} lead(s)` });
      setPicked(new Set());
      doSearch();
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Merge failed' });
    } finally { setMerging(false); setConfirm(null); }
  };

  const togglePick = (id) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const searchMergeable = useMemo(
    () => picked.size >= 2 && searchSurvivor && picked.has(searchSurvivor),
    [picked, searchSurvivor],
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        title="Duplicate leads"
        subtitle={ownerScoped
          ? 'Find the same person filed twice in your own leads, and merge them.'
          : 'Find the same person filed twice, and merge them into one record.'}
        icon={MergeTypeIcon}
      />

      {ownerScoped && (
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          You can merge duplicates where <strong>you own every lead in the group</strong>.
          If one of them belongs to someone else it is not shown here — ask a
          manager, who can merge across owners.
        </Alert>
      )}

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="scan" label="Scan" sx={{ textTransform: 'none' }} />
        <Tab value="search" label="Search and merge" sx={{ textTransform: 'none' }} />
      </Tabs>

      {tab === 'scan' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                select size="small" label="Match on" sx={{ minWidth: 260 }}
                value={mode} onChange={(e) => setMode(e.target.value)}
              >
                <MenuItem value="contact">Phone or WhatsApp number</MenuItem>
                <MenuItem value="name">Name (suggestions)</MenuItem>
              </TextField>
              <Button
                variant="contained" onClick={runScan} disabled={loading}
                sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
              >
                {loading ? 'Scanning…' : 'Run scan'}
              </Button>
              <Box sx={{ fontSize: 12.5, color: FAINT }}>
                {mode === 'contact'
                  ? 'Matches a number in either field against either field.'
                  : 'Same name is a hint, not proof — check each group before merging.'}
              </Box>
            </Box>
          </Card>

          {loading && <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={26} /></Box>}

          {scanned && !loading && groups.length === 0 && (
            <Card>
              <EmptyState
                icon="✅"
                title="No duplicates found"
                text={ownerScoped
                  ? 'Nothing matched among the leads you own. Duplicates shared with another owner are handled by a manager.'
                  : 'Nothing matched on that rule.'}
              />
            </Card>
          )}

          {!loading && groups.length > 0 && (
            <Box sx={{ fontSize: 13, color: MUTE, mb: 1.5 }}>
              {groups.length} group{groups.length === 1 ? '' : 's'} found.
              Pick the lead to keep in each, then merge.
            </Box>
          )}

          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {groups.map((g) => (
              <Card key={g.match_value} pad={0}>
                <Box sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  px: 1.5, py: 1, borderBottom: `1px solid ${LINE}`,
                }}
                >
                  <Box sx={{ fontSize: 13, fontWeight: 700, color: INK }}>
                    {mode === 'contact' ? `…${g.match_value}` : g.match_value}
                    <span style={{ fontWeight: 400, color: FAINT }}> · {g.leads.length} leads</span>
                  </Box>
                  <Button
                    size="small" variant="outlined" disabled={merging}
                    onClick={() => setConfirm({ kind: 'group', group: g })}
                    sx={{ textTransform: 'none' }}
                  >
                    Merge {g.leads.length - 1} into selected
                  </Button>
                </Box>
                {g.leads.map((l) => (
                  <LeadRow
                    key={l.id} lead={l}
                    survivorId={survivors[g.match_value]}
                    onPick={(id) => setSurvivors((p) => ({ ...p, [g.match_value]: id }))}
                  />
                ))}
              </Card>
            ))}
          </Box>
        </>
      )}

      {tab === 'search' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                size="small" label="Search by name, phone or email" sx={{ minWidth: 320 }}
                value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
              />
              <Button
                variant="contained" startIcon={<SearchIcon />} onClick={doSearch}
                disabled={searching || !q.trim()} sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
              >
                {searching ? 'Searching…' : 'Search'}
              </Button>
            </Box>
            <Box sx={{ fontSize: 12.5, color: FAINT, mt: 1 }}>
              Tick every row that is the same person, then choose which one to keep.
            </Box>
          </Card>

          {results.length > 0 && (
            <Card pad={0}>
              <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                px: 1.5, py: 1, borderBottom: `1px solid ${LINE}`,
              }}
              >
                <Box sx={{ fontSize: 13, color: MUTE }}>
                  {picked.size} selected
                  {picked.size > 0 && !picked.has(searchSurvivor)
                    && ' — tick the one you are keeping too'}
                </Box>
                <Button
                  size="small" variant="outlined" disabled={!searchMergeable || merging}
                  onClick={() => setConfirm({ kind: 'search' })}
                  sx={{ textTransform: 'none' }}
                >
                  Merge {Math.max(0, picked.size - 1)} into selected
                </Button>
              </Box>
              {results.map((l) => (
                <Box key={l.id} sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Checkbox
                    size="small" checked={picked.has(l.id)}
                    onChange={() => togglePick(l.id)} sx={{ mt: 1.2, ml: 0.5 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <LeadRow
                      lead={l} survivorId={searchSurvivor}
                      onPick={setSearchSurvivor}
                      showPick={picked.has(l.id)}
                    />
                  </Box>
                </Box>
              ))}
            </Card>
          )}
        </>
      )}

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>Merge these leads?</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ fontSize: 13.5, color: INK }}>
            One lead is kept. The others are removed from the list, and all of
            their activities, notes, follow-ups, calls and payments move onto
            the one you keep.
          </Box>
          <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
            Missing contact details on the kept lead are filled in from the
            others, so no phone or email is lost.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirm(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained" disabled={merging}
            onClick={() => (confirm.kind === 'group' ? mergeGroup(confirm.group) : mergeSearch())}
            sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
          >
            {merging ? 'Merging…' : 'Merge'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
