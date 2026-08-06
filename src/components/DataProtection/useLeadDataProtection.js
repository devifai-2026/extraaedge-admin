import { useEffect, useRef, useState } from 'react';
import { logSecurityEvent } from './securityEvents';

// Devtools-open heuristic: a real debugger statement's execution takes
// noticeably longer when devtools is open and paused on it, OR (cheaper, no
// visible stutter) the gap between outer and inner window dimensions grows
// past a threshold when a docked devtools panel eats viewport space.
// EXPLICITLY UNRELIABLE — undocked devtools, a resized window, or a browser
// zoom level can all produce false positives/negatives. Used only as an
// extra blur trigger + log signal, never as a hard block, and checked
// infrequently so it can't become its own performance problem.
const DEVTOOLS_SIZE_THRESHOLD = 160;
const DEVTOOLS_POLL_MS = 2000;

export function useLeadDataProtection() {
  const [isBlurred, setIsBlurred] = useState(false);
  const devtoolsFlaggedRef = useRef(false);

  useEffect(() => {
    const onBlur = () => {
      setIsBlurred(true);
      logSecurityEvent('lead.window_blur');
    };
    const onFocus = () => setIsBlurred(false);
    const onVisibility = () => {
      if (document.hidden) onBlur();
      else onFocus();
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const devtoolsInterval = setInterval(() => {
      const widthGap = window.outerWidth - window.innerWidth;
      const heightGap = window.outerHeight - window.innerHeight;
      const suspected = widthGap > DEVTOOLS_SIZE_THRESHOLD || heightGap > DEVTOOLS_SIZE_THRESHOLD;
      if (suspected) {
        setIsBlurred(true);
        if (!devtoolsFlaggedRef.current) {
          devtoolsFlaggedRef.current = true;
          logSecurityEvent('lead.devtools_suspected');
        }
      } else {
        devtoolsFlaggedRef.current = false;
      }
    }, DEVTOOLS_POLL_MS);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(devtoolsInterval);
    };
  }, []);

  return { isBlurred };
}
