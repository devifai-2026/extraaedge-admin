// Temporary placeholder for student panel tabs whose feature phase hasn't
// shipped yet (Classes, Forum, Tests, Projects, Leaderboard, Catalog). Keeps
// the nav navigable in Phase 1; each is replaced by its real page in later
// phases.
export default function StudentPlaceholder({ title = 'Coming soon' }) {
  return (
    <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontWeight: 700, color: '#475569', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13 }}>This section will be available shortly.</div>
    </div>
  );
}
