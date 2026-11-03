// One course selection, shared by every trainer page.
//
// WHY THIS EXISTS. Eleven trainer pages each rendered their own
// `<TextField select label="Course">` and refused to show anything until it
// was used. The selection was component state, so it died on unmount: pick
// "Full Stack" on Announcements, click Forum, pick it again. Across a session
// that is the same choice made over and over, and it is the single biggest
// reason the portal feels heavy next to Teams.
//
// The fix is not a nicer picker. It is that a picker should be a FILTER on
// content, never a GATE in front of it. A trainer with one course should
// never see one at all.
//
// Resolution order, strictest first:
//   1. ?course=<uuid>      — the URL wins, so every page is deep-linkable
//   2. localStorage        — survives a reload and a new tab
//   3. 'all'               — when the page supports it
//   4. the only course     — a one-course trainer is never asked
//
// The id is validated against the courses actually returned, so a stale
// localStorage value from a course the trainer lost access to falls back
// instead of silently querying something they can no longer see.
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { coursesApi } from '../../lib/endpoints';

const KEY = 'trainer.courseId';
const ALL = 'all';

const CourseScopeContext = createContext(null);

export const CourseScopeProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseIdState] = useState(() => {
    try { return localStorage.getItem(KEY) || ALL; } catch { return ALL; }
  });

  // The URL is the source of truth when it carries one.
  const urlCourse = searchParams.get('course');

  useEffect(() => {
    let alive = true;
    coursesApi.list()
      .then((r) => { if (alive) setCourses(r?.data || []); })
      .catch(() => { if (alive) setCourses([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Reconcile against the real list by DERIVING, not by syncing state in an
  // effect: drop an id the trainer can no longer see, and collapse to the
  // single course when there is only one. Deriving keeps the first render
  // correct — an effect would paint one frame with a stale course and, worse,
  // re-enter on its own state write.
  const effectiveId = useMemo(() => {
    const wanted = urlCourse || courseId;
    if (loading) return wanted;
    const ids = courses.map((c) => c.id);
    if (ids.length === 1) return ids[0];
    if (wanted !== ALL && !ids.includes(wanted)) return ALL;
    return wanted;
  }, [loading, courses, urlCourse, courseId]);

  const setCourseId = useCallback((id) => {
    const next = id || ALL;
    setCourseIdState(next);
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
    // replace, not push: changing a filter should not stack history entries
    // the Back button then has to walk through.
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next === ALL) p.delete('course'); else p.set('course', next);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  const value = useMemo(() => ({
    courseId: effectiveId,
    setCourseId,
    courses,
    loading,
    // `null` when scoped to all courses — call sites pass this straight to an
    // API and omitting the param is what "all" means on the wire.
    programId: effectiveId === ALL ? null : effectiveId,
    course: courses.find((c) => c.id === effectiveId) || null,
    isAll: effectiveId === ALL,
  }), [effectiveId, setCourseId, courses, loading]);

  return <CourseScopeContext.Provider value={value}>{children}</CourseScopeContext.Provider>;
};

// Safe outside the provider (e.g. a page rendered by another layout) — returns
// a neutral scope rather than throwing, so one stray import cannot blank a page.
export const useCourseScope = () => useContext(CourseScopeContext) || {
  courseId: ALL, setCourseId: () => {}, courses: [], loading: false,
  programId: null, course: null, isAll: true,
};

// The picker itself. Lives in the toolbar as a filter.
//
// Renders NOTHING when the trainer has one course or none: a select with a
// single option is a decision the product already made, shown as if it were
// the user's to make.
// Course switcher.
//
// Was a native <select>, which renders as an OS dropdown that matches nothing
// else on the page and hides every option behind a click — with five courses
// you could not see what you were choosing between.
//
// Up to five courses it is a pill row: every option visible, one click to
// switch, and it reads as part of the page. Beyond that a row would wrap and
// become its own mess, so it falls back to a styled select.
export const CoursePicker = ({ allowAll = true, max = 5 }) => {
  const { courseId, setCourseId, courses, loading } = useCourseScope();
  // One course is not a choice — showing a picker implies a decision the
  // product already made for you.
  if (loading || courses.length <= 1) return null;

  const opts = allowAll ? [{ id: ALL, name: 'All courses' }, ...courses] : courses;

  if (opts.length > max + 1) {
    return (
      <select
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        style={{
          height: 32, borderRadius: 9, border: '1px solid #cbd5e1', background: '#fff',
          fontSize: 12.5, fontFamily: 'inherit', color: '#0f172a', padding: '0 10px',
          maxWidth: 260, cursor: 'pointer',
        }}
      >
        {opts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: '#f1f5f9', padding: 3, borderRadius: 999 }}>
      {opts.map((c) => {
        const on = courseId === c.id;
        // Long course names ("Data Analyst with AI Training and
        // Certification") would blow the row apart, so shorten to the
        // distinctive words and keep the full name in the tooltip.
        const label = c.name.length > 22 ? `${c.name.slice(0, 21)}…` : c.name;
        return (
          <button
            key={c.id}
            type="button"
            title={c.name}
            onClick={() => setCourseId(c.id)}
            style={{
              border: 0, cursor: 'pointer', fontFamily: 'inherit',
              borderRadius: 999, padding: '6px 13px', fontSize: 12.5,
              fontWeight: on ? 700 : 550, whiteSpace: 'nowrap',
              background: on ? '#fff' : 'transparent',
              color: on ? 'var(--lms-accent, #E53935)' : '#64748b',
              boxShadow: on ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export const ALL_COURSES = ALL;
