import { createPortal } from 'react-dom';
import { auth } from '../../lib/endpoints';
import { studentAuth } from '../../lib/studentApi';
import { ROLES } from '../../lib/rbac';
import Watermark from './Watermark';

// The single decision point for "does this viewer get a watermark?", mounted
// once in Layout so every authenticated staff page and every modal inherits
// it. Previously the overlay lived inside ProtectedLeadData and so reached
// only four tables — the lead card view, every other page and all ~78
// dialog/drawer files were unmarked.
//
// Exemptions:
//   • no staff user      — logged out, or the student portal (separate
//                          studentAuth JWT). This one matters: on the student
//                          portal auth.getUser() is null, so currentRole()
//                          returns null, which is NOT 'super_admin' and would
//                          sail past a naive "everyone except super_admin".
//   • super_admin        — already sees everything unmasked from the API;
//                          this exists to trace staff, not the owner.
//   • trainer tiers      — the trainer portal is out of scope.
const EXEMPT_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.TRAINER,
  ROLES.HEAD_TRAINER,
  ROLES.STUDENT,
]);

// MUI puts Dialog/Drawer at z-index 1300 and Tooltip at 1500. The page layer
// sits just under the modal layer; the portal layer sits just above it, so a
// dialog is covered too without hiding tooltips. Both are pointer-events:none,
// so the dialog underneath stays fully interactive.
const PAGE_Z = 1200;
const OVERLAY_Z = 1400;

export default function GlobalWatermark() {
  const user = auth.getUser();

  if (!user) return null;
  if (studentAuth.isAuthed()) return null;
  if (EXEMPT_ROLES.has(user.role)) return null;

  return (
    <>
      <Watermark zIndex={PAGE_Z} />
      {typeof document !== 'undefined'
        ? createPortal(<Watermark zIndex={OVERLAY_Z} />, document.body)
        : null}
    </>
  );
}
