// Reusable Settings → ... breadcrumb that matches the design in the screenshots.
import { useNavigate } from 'react-router-dom';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export default function Breadcrumb({ trail }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '20px 24px', fontSize: 16 }}>
      {trail.map((t, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              onClick={() => !isLast && t.path && navigate(t.path)}
              style={{
                color: isLast ? '#333' : '#888',
                fontWeight: isLast ? 600 : 400,
                cursor: !isLast && t.path ? 'pointer' : 'default',
              }}
            >
              {t.label}
            </span>
            {!isLast && <ChevronRightIcon style={{ color: '#bbb', fontSize: 18 }} />}
          </span>
        );
      })}
    </div>
  );
}
