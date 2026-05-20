import { useEffect, useState } from 'react';
import { fetchUserHousehold } from './householdService.js';

export function useHousehold(user) {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadHousehold() {
      if (!user) {
        setHousehold(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await fetchUserHousehold();

      if (!active) return;
      setHousehold(result.household);
      setMembers(result.members || []);
      setError(result.error || null);
      setLoading(false);
    }

    loadHousehold();

    return () => {
      active = false;
    };
  }, [user]);

  return {
    household,
    members,
    loading,
    error
  };
}
