// Routed wrapper around the live class console.
//
// The console itself (TrainerClassConsole) is the richest thing in the trainer
// portal — start/end the class, fire MCQ attendance questions, watch the
// present/absent table update over the socket, grade long-text answers by
// hand. It had NO route: the only way in was Classes → pick a course → find
// the row → "Open console". Four interactions to reach the thing a trainer
// needs the moment a class begins.
//
// This gives it a URL so Today can link straight to it, and so a trainer can
// bookmark the class they teach every morning.
//
// A thin wrapper rather than a refactor: the console takes a `cls` object and
// renders as a Dialog, and 337 lines of working socket code is not something
// to restructure for the sake of a route. The wrapper resolves the id to that
// object and hands it over unchanged, so the modal path keeps working too.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { Card, EmptyState, Skeleton, Breadcrumb, Btn } from '../../lib/lmsUi';
import { classesApi } from '../../lib/endpoints';
import TrainerClassConsole from './TrainerClassConsole';

export default function TrainerClassConsolePage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [loading, setLoading] = useState(true);

  // There is no GET /classes/:id, and adding one to reach a row the trainer
  // can already list would be a new endpoint for no new capability. The list
  // is scoped server-side to this trainer's courses, so finding the class in
  // it is both correct and authorised by construction.
  useEffect(() => {
    let alive = true;
    classesApi.list()
      .then((r) => { if (alive) setCls((r?.data || []).find((c) => c.id === classId) || null); })
      .catch(() => { if (alive) setCls(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [classId]);

  if (loading) {
    return <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}><Card><Skeleton h={160} /></Card></Box>;
  }

  if (!cls) {
    return (
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        <Card>
          <EmptyState
            icon="🔍"
            title="Class not found"
            text="It may have been deleted, or it belongs to a course you don't teach."
            action={<Btn onClick={() => navigate('/trainer/today')}>Back to Today</Btn>}
          />
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Breadcrumb
        items={[
          { label: 'Today', onClick: () => navigate('/trainer/today'), to: '/trainer/today' },
          { label: cls.batch_name || 'Class' },
          { label: cls.title },
        ]}
      />
      {/* Closing a routed console means leaving the page, not hiding a modal. */}
      <TrainerClassConsole cls={cls} onClose={() => navigate('/trainer/today')} />
    </Box>
  );
}
