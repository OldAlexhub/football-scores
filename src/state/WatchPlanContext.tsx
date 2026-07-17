import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  listWatchPlanItems,
  removeWatchPlanItem,
  reorderWatchPlanItems,
  upsertWatchPlanItem,
} from '../storage/repositories/watchPlanRepo';
import type { WatchPlanItem } from '../types/domain';
import { usePreferences } from './PreferencesContext';

interface WatchPlanContextValue {
  items: WatchPlanItem[];
  loading: boolean;
  getItem: (matchId: string) => WatchPlanItem | undefined;
  addOrUpdate: (matchId: string, patch: Partial<Omit<WatchPlanItem, 'id' | 'matchId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  remove: (matchId: string) => Promise<void>;
  reorder: (orderedMatchIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const WatchPlanContext = createContext<WatchPlanContextValue>({
  items: [],
  loading: true,
  getItem: () => undefined,
  addOrUpdate: async () => undefined,
  remove: async () => undefined,
  reorder: async () => undefined,
  refresh: async () => undefined,
});

export function WatchPlanProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WatchPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { preferences } = usePreferences();

  const refresh = useCallback(async () => {
    const all = await listWatchPlanItems();
    setItems(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getItem = useCallback((matchId: string) => items.find(i => i.matchId === matchId), [items]);

  const addOrUpdate = useCallback(async (matchId: string, patch: Partial<Omit<WatchPlanItem, 'id' | 'matchId' | 'createdAt' | 'updatedAt'>>) => {
    await upsertWatchPlanItem(matchId, patch, preferences.defaultSpoilerShieldEnabled);
    await refresh();
  }, [preferences.defaultSpoilerShieldEnabled, refresh]);

  const remove = useCallback(async (matchId: string) => {
    await removeWatchPlanItem(matchId);
    await refresh();
  }, [refresh]);

  const reorder = useCallback(async (orderedMatchIds: string[]) => {
    await reorderWatchPlanItems(orderedMatchIds);
    await refresh();
  }, [refresh]);

  return (
    <WatchPlanContext.Provider value={{ items, loading, getItem, addOrUpdate, remove, reorder, refresh }}>
      {children}
    </WatchPlanContext.Provider>
  );
}

export function useWatchPlan(): WatchPlanContextValue {
  return useContext(WatchPlanContext);
}
