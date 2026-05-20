import { supabase } from '../../lib/supabaseClient.js';

export async function fetchUserHousehold() {
  if (!supabase) return { household: null, members: [], error: new Error('Supabase nao configurado') };

  const { data: memberships, error } = await supabase
    .from('household_members')
    .select('household_id, role, households(id, name, created_by), profiles(id, display_name, email)')
    .limit(1);

  if (error) return { household: null, members: [], error };
  if (!memberships || memberships.length === 0) return { household: null, members: [], error: null };

  const household = memberships[0].households;

  const { data: members, error: membersError } = await supabase
    .from('household_members')
    .select('role, profiles(id, display_name, email)')
    .eq('household_id', household.id)
    .order('created_at', { ascending: true });

  if (membersError) return { household, members: [], error: membersError };

  return {
    household,
    members: (members || []).map((item) => ({
      id: item.profiles.id,
      displayName: item.profiles.display_name,
      email: item.profiles.email,
      role: item.role
    })),
    error: null
  };
}
