import { useEffect, useState } from 'react';
import { fetchCompetitions } from '../providers/providerManager';
import type { Competition } from '../types/domain';

export function useCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchCompetitions().then(result => {
      if (!mounted) return;
      setCompetitions(result.data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { competitions, loading };
}
