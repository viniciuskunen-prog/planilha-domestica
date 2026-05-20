import { supabase } from '../../lib/supabaseClient.js';

export async function fetchUserHousehold() {
  if (!supabase) return { household: null, members: [], error: new Error('Supabase nao configurado') };

  const { data: memberships, error } = await supabase
    .from('household_members')
    .select('household_id, role, households(id, name, created_by)')
    .limit(1);

  if (error) return { household: null, members: [], error };
  if (!memberships || memberships.length === 0) return { household: null, members: [], error: null };

  const household = memberships[0].households;
  if (!household) return { household: null, members: [], error: null };

  const { data: memberRows, error: membersError } = await supabase
    .from('household_members')
    .select('user_id, role')
    .eq('household_id', household.id)
    .order('created_at', { ascending: true });

  if (membersError) return { household, members: [], error: membersError };

  const userIds = (memberRows || []).map((item) => item.user_id);

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .in('id', userIds);

  if (profilesError) return { household, members: [], error: profilesError };

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return {
    household,
    members: (memberRows || []).map((item) => {
      const profile = profilesById.get(item.user_id);

      return {
        id: item.user_id,
        displayName: profile?.display_name || 'Usuario',
        email: profile?.email || null,
        role: item.role
      };
    }),
    error: null
  };
}
