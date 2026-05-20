import { useEffect, useState } from 'react';
import { getCurrentSession, onAuthStateChange } from './authService.js';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const result = await getCurrentSession();
      if (!active) return;
      setSession(result.session);
      setError(result.error || null);
      setLoading(false);
    }

    loadSession();

    const subscription = onAuthStateChange((nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const isConfigured = !error || error.message !== 'Supabase nao configurado';

  return {
    session,
    user: session ? session.user : null,
    loading,
    error,
    isConfigured
  };
}
