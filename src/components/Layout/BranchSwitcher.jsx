// Branch switcher — super_admin only. Lets the admin view the app "as" a
// single branch: every lead/analytics call carries the chosen branch_id (see
// withBranch in lib/endpoints). "All branches" clears the filter. The choice
// is persisted in localStorage (auth.setActiveBranch) and a full reload is the
// simplest way to re-fetch every page's data with the new scope.
import { useEffect, useState } from 'react';
import { Select, MenuItem, Box } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { branchesApi } from '../../lib/endpoints';
import { auth } from '../../lib/api';
import { isRole, ROLES } from '../../lib/rbac';

export default function BranchSwitcher() {
  const isAdmin = isRole(ROLES.SUPER_ADMIN);
  const [branches, setBranches] = useState([]);
  const [active, setActive] = useState(auth.getActiveBranch() || '');

  useEffect(() => {
    if (!isAdmin) return;
    branchesApi.list().then((res) => setBranches(res?.data || [])).catch(() => setBranches([]));
  }, [isAdmin]);

  // Only show the switcher to admins of a multi-branch tenant.
  if (!isAdmin || branches.length === 0) return null;

  const onChange = (e) => {
    const val = e.target.value;
    setActive(val);
    auth.setActiveBranch(val);
    // Reload so every mounted page re-fetches with the new branch scope.
    window.location.reload();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
      <AccountTreeOutlinedIcon sx={{ fontSize: 18, color: '#888', mr: 0.5 }} />
      <Select
        size="small"
        value={active}
        onChange={onChange}
        displayEmpty
        variant="standard"
        disableUnderline
        sx={{ fontSize: 13, fontWeight: 600, color: '#444', minWidth: 120 }}
        renderValue={(v) => {
          if (!v) return 'All branches';
          const b = branches.find((x) => x.id === v);
          return b ? b.name : 'All branches';
        }}
      >
        <MenuItem value=""><em>All branches</em></MenuItem>
        {branches.map((b) => (
          <MenuItem key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</MenuItem>
        ))}
      </Select>
    </Box>
  );
}
