import { supabase } from '../../lib/supabaseClient.js';

export async function getCurrentSession() {
  if (!supabase) return { session: null, error: new Error('Supabase nao configurado') };

  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session || null, error };
}

export async function signInWithPassword(email, password) {
  if (!supabase) return { data: null, error: new Error('Supabase nao configurado') };

  return supabase.auth.signInWithPassword({
    email,
    password
  });
}

export async function signUpWithPassword({ email, password, displayName }) {
  if (!supabase) return { data: null, error: new Error('Supabase nao configurado') };

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      }
    }
  });
}

export async function signOut() {
  if (!supabase) return { error: new Error('Supabase nao configurado') };

  return supabase.auth.signOut();
}

export function onAuthStateChange(callback) {
  if (!supabase) return { unsubscribe: () => {} };

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return data.subscription;
}
