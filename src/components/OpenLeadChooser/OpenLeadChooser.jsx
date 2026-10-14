import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, Typography, CircularProgress,
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

// "What would you like to open?" — the two-way chooser shown when a lead is
// clicked from a list.
//
// Two large targets rather than a menu, since this is a deliberate choice and
// both options are equally likely: the timeline answers "what has happened
// with this lead", the form answers "what are this lead's details".
//
// Extracted from LeadPool so the Follow-up Manager renders the SAME dialog
// rather than a second copy. Two copies would be free to drift in wording,
// behaviour and permission text — and this dialog states whether the form is
// editable, which is exactly the kind of thing that must not drift.
//
// Props:
//   lead       — the row to open ({ id, name, phone, ... }); falsy = closed
//   loading    — truthy while the lead form is being fetched (disables both)
//   canEdit    — whether the form will open editable, for the caption
//   onTimeline — called with `lead` when "Lead timeline" is picked
//   onDetails  — called with `lead` when "Lead details" is picked
//   onCancel   — called when dismissed
const OpenLeadChooser = ({
  lead, loading = false, canEdit = false,
  onTimeline, onDetails, onCancel,
}) => (
  <Dialog
    open={!!lead}
    onClose={() => { if (!loading) onCancel?.(); }}
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle sx={{ pb: 0.5 }}>
      <Typography component="div" sx={{ fontWeight: 700, fontSize: 17 }}>
        {lead?.name || 'Lead'}
      </Typography>
      <Typography variant="caption" sx={{ color: '#6b7280' }}>
        What would you like to open?
      </Typography>
    </DialogTitle>
    <DialogContent sx={{ pt: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 1 }}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<TimelineIcon />}
          disabled={loading}
          onClick={() => onTimeline?.(lead)}
          sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.25 }}
        >
          <Box sx={{ textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 600, lineHeight: 1.3 }}>Lead timeline</Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              Activities, notes, calls and stage changes
            </Typography>
          </Box>
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={loading ? <CircularProgress size={18} /> : <DescriptionOutlinedIcon />}
          disabled={loading}
          onClick={() => onDetails?.(lead)}
          sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.25 }}
        >
          <Box sx={{ textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 600, lineHeight: 1.3 }}>Lead details</Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {canEdit ? 'Open the full lead form — editable' : 'Open the full lead form — read-only'}
            </Typography>
          </Box>
        </Button>
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => onCancel?.()} disabled={loading}>Cancel</Button>
    </DialogActions>
  </Dialog>
);

export default OpenLeadChooser;
