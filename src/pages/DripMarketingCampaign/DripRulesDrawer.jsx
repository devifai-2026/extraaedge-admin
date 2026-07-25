import React from "react";
import {
    Drawer,
    IconButton,
    Button,
    Tabs,
    Tab,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    CircularProgress,
    Chip,
    Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { colors } from "../../theme/colors";
import { campaignsDripApi } from "../../lib/endpoints";
import AddRuleModal from "./AddRuleModal";
import EditRuleModal from "./EditRuleModal";

const fmtDateTime = (iso) =>
    iso
        ? new Date(iso).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true
          })
        : "-";

const channelLabel = (ch) => (ch === "email" ? "Email" : ch === "sms" ? "SMS" : ch);

// Side drawer for one drip campaign: its steps (rules), execution runs, and stats.
export default function DripRulesDrawer({
    drip,
    open,
    canManage,
    onClose,
    onChanged,
    onToast
}) {
    const [tab, setTab] = React.useState(0);
    const [rules, setRules] = React.useState([]);
    const [runs, setRuns] = React.useState([]);
    const [stats, setStats] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [addStepOpen, setAddStepOpen] = React.useState(false);
    const [editStep, setEditStep] = React.useState(null);

    const dripId = drip?.id;
    // Default audience condition seeded onto new steps (from create flow).
    const defaultCondition = drip?.__audienceCondition || {};

    const loadAll = React.useCallback(async () => {
        if (!dripId) return;
        setLoading(true);
        try {
            const [detail, runsRes, statsRes] = await Promise.all([
                campaignsDripApi.get(dripId),
                campaignsDripApi.runs(dripId).catch(() => ({ data: [] })),
                campaignsDripApi.stats(dripId).catch(() => ({ data: [] }))
            ]);
            setRules(detail?.data?.rules || []);
            setRuns(runsRes?.data || []);
            setStats(statsRes?.data || []);
        } catch (e) {
            onToast?.(e?.message || "Failed to load campaign details", "error");
            setRules([]);
            setRuns([]);
            setStats([]);
        } finally {
            setLoading(false);
        }
    }, [dripId, onToast]);

    React.useEffect(() => {
        if (open && dripId) {
            setTab(0);
            loadAll();
        }
    }, [open, dripId, loadAll]);

    const nextStepOrder = React.useMemo(
        () => (rules.length ? Math.max(...rules.map((r) => r.step_order || 0)) + 1 : 1),
        [rules]
    );

    const handleDeleteStep = async (rule) => {
        if (!window.confirm(`Delete step ${rule.step_order}?`)) return;
        try {
            await campaignsDripApi.deleteRule(dripId, rule.id);
            onToast?.("Step deleted");
            await loadAll();
        } catch (e) {
            onToast?.(e?.message || "Failed to delete step", "error");
        }
    };

    const statsByStatus = React.useMemo(() => {
        const m = {};
        stats.forEach((s) => {
            m[s.status] = s.n;
        });
        return m;
    }, [stats]);

    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <div style={{ width: 640, maxWidth: "90vw", display: "flex", flexDirection: "column", height: "100%" }}>
                <div
                    style={{
                        background: colors.primary,
                        padding: "14px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: colors.white
                    }}
                >
                    <div>
                        <span style={{ fontWeight: 600 }}>{drip?.name || drip?.description || "Drip Campaign"}</span>
                        {drip?.active ? (
                            <Chip
                                label="Active"
                                size="small"
                                sx={{ ml: 1, background: colors.white, color: colors.primary, height: 20 }}
                            />
                        ) : (
                            <Chip
                                label="Inactive"
                                size="small"
                                sx={{ ml: 1, background: "rgba(255,255,255,0.25)", color: colors.white, height: 20 }}
                            />
                        )}
                    </div>
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon sx={{ color: colors.white }} />
                    </IconButton>
                </div>

                <Tabs
                    value={tab}
                    onChange={(_e, t) => setTab(t)}
                    sx={{
                        borderBottom: `1px solid ${colors.borderGrey}`,
                        "& .Mui-selected": { color: `${colors.primary} !important` },
                        "& .MuiTabs-indicator": { backgroundColor: colors.primary }
                    }}
                >
                    <Tab label={`Steps (${rules.length})`} sx={{ textTransform: "none" }} />
                    <Tab label="Runs" sx={{ textTransform: "none" }} />
                    <Tab label="Stats" sx={{ textTransform: "none" }} />
                </Tabs>

                <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                            <CircularProgress />
                        </div>
                    ) : (
                        <>
                            {tab === 0 && (
                                <>
                                    {canManage && (
                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            onClick={() => setAddStepOpen(true)}
                                            sx={{
                                                mb: 2,
                                                textTransform: "none",
                                                backgroundColor: colors.primary,
                                                "&:hover": { backgroundColor: colors.primaryDark }
                                            }}
                                        >
                                            Add Step
                                        </Button>
                                    )}
                                    {rules.length === 0 ? (
                                        <Typography style={{ color: colors.textSecondary, fontSize: 14 }}>
                                            No steps yet. {canManage ? "Add a step to define what gets sent and when." : ""}
                                        </Typography>
                                    ) : (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>#</TableCell>
                                                    <TableCell>Day Offset</TableCell>
                                                    <TableCell>Channel</TableCell>
                                                    <TableCell>Template</TableCell>
                                                    {canManage && <TableCell align="right"></TableCell>}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {rules.map((r) => (
                                                    <TableRow key={r.id}>
                                                        <TableCell>{r.step_order}</TableCell>
                                                        <TableCell>Day {r.day_offset}</TableCell>
                                                        <TableCell>{channelLabel(r.channel)}</TableCell>
                                                        <TableCell
                                                            style={{
                                                                maxWidth: 160,
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap"
                                                            }}
                                                            title={r.template_id}
                                                        >
                                                            {r.template_id}
                                                        </TableCell>
                                                        {canManage && (
                                                            <TableCell align="right">
                                                                <IconButton size="small" onClick={() => setEditStep(r)}>
                                                                    <EditOutlinedIcon fontSize="small" />
                                                                </IconButton>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleDeleteStep(r)}
                                                                    sx={{ color: colors.error }}
                                                                >
                                                                    <DeleteOutlinedIcon fontSize="small" />
                                                                </IconButton>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </>
                            )}

                            {tab === 1 && (
                                runs.length === 0 ? (
                                    <Typography style={{ color: colors.textSecondary, fontSize: 14 }}>
                                        No runs yet. Runs appear once the scheduler processes eligible leads.
                                    </Typography>
                                ) : (
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Executed</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Lead</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {runs.map((run) => (
                                                <TableRow key={run.id}>
                                                    <TableCell>{fmtDateTime(run.executed_at)}</TableCell>
                                                    <TableCell>{run.status}</TableCell>
                                                    <TableCell
                                                        style={{
                                                            maxWidth: 160,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap"
                                                        }}
                                                        title={run.lead_id}
                                                    >
                                                        {run.lead_id}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )
                            )}

                            {tab === 2 && (
                                stats.length === 0 ? (
                                    <Typography style={{ color: colors.textSecondary, fontSize: 14 }}>
                                        No stats yet.
                                    </Typography>
                                ) : (
                                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                        {["queued", "sent", "failed", "skipped"].map((s) =>
                                            statsByStatus[s] !== undefined ? (
                                                <div
                                                    key={s}
                                                    style={{
                                                        border: `1px solid ${colors.borderGrey}`,
                                                        borderRadius: 8,
                                                        padding: "14px 20px",
                                                        minWidth: 110,
                                                        textAlign: "center"
                                                    }}
                                                >
                                                    <div style={{ fontSize: 24, fontWeight: 700, color: colors.primary }}>
                                                        {statsByStatus[s]}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            color: colors.textSecondary,
                                                            textTransform: "capitalize"
                                                        }}
                                                    >
                                                        {s}
                                                    </div>
                                                </div>
                                            ) : null
                                        )}
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>

            <AddRuleModal
                open={addStepOpen}
                dripId={dripId}
                stepOrder={nextStepOrder}
                defaultCondition={defaultCondition}
                onClose={() => setAddStepOpen(false)}
                onSaved={() => {
                    setAddStepOpen(false);
                    onToast?.("Step added");
                    loadAll();
                    onChanged?.();
                }}
                onToast={onToast}
            />

            <EditRuleModal
                open={Boolean(editStep)}
                dripId={dripId}
                rule={editStep}
                onClose={() => setEditStep(null)}
                onSaved={() => {
                    setEditStep(null);
                    onToast?.("Step updated");
                    loadAll();
                    onChanged?.();
                }}
                onToast={onToast}
            />
        </Drawer>
    );
}
