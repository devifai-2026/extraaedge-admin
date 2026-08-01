// Landing page for a product-owner "log in as this tenant's admin" handoff.
//
// The PO console can't write this app's session storage (different origin), so
// it sends the operator here with a single-use code. We redeem the code for
// the impersonation token pair, drop it into the normal session slots, and
// hand off to the dashboard — from that point the app behaves exactly as if
// the tenant's super admin had logged in.
//
// Public route: there is no session yet when this runs.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../../lib/api';
import { impersonationApi } from '../../lib/endpoints';
import { applyThemeFromUser } from '../../theme/applyTheme';
import { firstAllowedRoute } from '../../lib/rbac';

export default function SudoLanding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  // React 18 StrictMode double-invokes effects in dev; the code is single-use,
  // so a second redemption would fail and clobber a successful login.
  const redeemed = useRef(false);

  useEffect(() => {
    const code = params.get('code');
    if (!code) { setError('This login link is missing its code.'); return; }
    if (redeemed.current) return;
    redeemed.current = true;

    (async () => {
      try {
        const r = await impersonationApi.exchange(code);
        const payload = r?.data ?? r;
        if (!payload?.access_token) throw new Error('No session returned');
        // Start from a clean slate so nothing from a previous tenant session
        // in this browser leaks into the impersonated one.
        auth.clear();
        auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
          user: payload.user,
          tenant: payload.tenant,
          allowed_tabs: payload.allowed_tabs,
        });
        try { applyThemeFromUser(payload.user); } catch { /* branding is cosmetic */ }
        // Land on the first tab this account can actually open, exactly as a
        // normal login does — a custom role may not have /dashboard.
        navigate(firstAllowedRoute(), { replace: true });
      } catch (e) {
        setError(e?.message || 'Could not open this tenant. Ask the console to generate a fresh link.');
      }
    })();
  }, [params, navigate]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        {error ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
              Sign-in link not usable
            </div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>{error}</div>
            <button
              onClick={() => navigate('/', { replace: true })}
              style={{
                background: '#E53935', color: '#fff', border: 'none',
                padding: '9px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
              }}
            >
              Go to login
            </button>
          </>
        ) : (
          <div style={{ fontSize: 15, color: '#64748b' }}>Opening the tenant console…</div>
        )}
      </div>
    </div>
  );
}
