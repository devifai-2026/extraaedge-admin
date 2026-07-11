// Student Announcements — course feed (incl. auto-posted recording notices);
// comment + like. Reuses the shared AnnouncementFeed with premium cards.
import { useEffect, useState, useCallback } from 'react';
import { studentApi } from '../../lib/studentApi';
import { AnnouncementFeed } from '../Trainer/TrainerAnnouncements';
import { PageHeader, Card, EmptyState, Skeleton } from '../../lib/lmsUi';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';

export default function StudentAnnouncements() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => studentApi.announcements().then((r) => setFeed(r?.data || [])).catch(() => {}).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);

  const api = {
    listComments: (id) => studentApi.announcementComments(id),
    comment: (id, body) => studentApi.announcementComment(id, body),
    like: (id) => studentApi.announcementLike(id),
  };

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Updates from your trainers." icon={CampaignIcon} />
      {loading ? <Card><Skeleton h={14} w="70%" /></Card>
        : feed.length === 0 ? <Card><EmptyState icon="📣" title="Nothing yet" text="Announcements from your course will appear here." /></Card>
        : <AnnouncementFeed feed={feed} api={api} onChange={load} />}
    </div>
  );
}
