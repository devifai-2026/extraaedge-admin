import React from 'react';

const STATUS_CLASS = {
  pending_approval: 'accounts-status-pending',
  attending: 'accounts-status-attending',
  on_break: 'accounts-status-on-break',
  completed: 'accounts-status-completed',
  rejected: 'accounts-status-rejected',
};
const STATUS_LABEL = {
  pending_approval: 'Pending',
  attending: 'Attending',
  on_break: 'On Break',
  completed: 'Completed',
  rejected: 'Rejected',
};

// Standalone-file export so the rest of utils.* can be plain functions
// without tripping the React Refresh "components + non-components" rule.
const StatusPill = ({ status }) => (
  <span className={`accounts-status-pill ${STATUS_CLASS[status] || ''}`}>
    {STATUS_LABEL[status] || status}
  </span>
);

export default StatusPill;
