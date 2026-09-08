import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  addFavorite,
  listFavorites,
  removeFavorite,
  reorderFavorites,
} from '../storage/repositories/favoritesRepo';
import { deletePlayerMeta, upsertPlayerMeta } from '../storage/repositories/followedPlayersRepo';
import type { Favorite, FollowedPlayerMeta } from '../types/domain';

type PlayerMetaInput = Omit<FollowedPlayerMeta, 'updatedAt'>;

interface FavoritesContextValue {
  favoriteCompetitionIds: Set<string>;
  favoriteTeamIds: Set<string>;
  favoritePlayerIds: Set<string>;
  loading: boolean;
  toggleCompetition: (id: string) => Promise<void>;
  toggleTeam: (id: string) => Promise<void>;
  togglePlayer: (id: string, meta?: PlayerMetaInput) => Promise<void>;
  reorderCompetitions: (orderedIds: string[]) => Promise<void>;
  reorderTeams: (orderedIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favoriteCompetitionIds: new Set(),
  favoriteTeamIds: new Set(),
  favoritePlayerIds: new Set(),
  loading: true,
  toggleCompetition: async () => undefined,
  toggleTeam: async () => undefined,
  togglePlayer: async () => undefined,
  reorderCompetitions: async () => undefined,
  reorderTeams: async () => undefined,
  refresh: async () => undefined,
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listFavorites();
    setFavorites(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleCompetition = useCallback(async (id: string) => {
    const already = favorites.some(f => f.entityType === 'competition' && f.entityId === id);
    if (already) {
      await removeFavorite('competition', id);
    } else {
      await addFavorite('competition', id);
    }
    await refresh();
  }, [favorites, refresh]);

  const toggleTeam = useCallback(async (id: string) => {
    const already = favorites.some(f => f.entityType === 'team' && f.entityId === id);
    if (already) {
      await removeFavorite('team', id);
    } else {
      await addFavorite('team', id);
    }
    await refresh();
  }, [favorites, refresh]);

  const togglePlayer = useCallback(async (id: string, meta?: PlayerMetaInput) => {
    const already = favorites.some(f => f.entityType === 'player' && f.entityId === id);
    if (already) {
      await removeFavorite('player', id);
      await deletePlayerMeta(id).catch(() => undefined);
    } else {
      await addFavorite('player', id);
      if (meta) await upsertPlayerMeta(meta).catch(() => undefined);
    }
    await refresh();
  }, [favorites, refresh]);

  const reorderCompetitions = useCallback(async (orderedIds: string[]) => {
    await reorderFavorites('competition', orderedIds);
    await refresh();
  }, [refresh]);

  const reorderTeams = useCallback(async (orderedIds: string[]) => {
    await reorderFavorites('team', orderedIds);
    await refresh();
  }, [refresh]);

  const favoriteCompetitionIds = new Set(favorites.filter(f => f.entityType === 'competition').map(f => f.entityId));
  const favoriteTeamIds = new Set(favorites.filter(f => f.entityType === 'team').map(f => f.entityId));
  const favoritePlayerIds = new Set(favorites.filter(f => f.entityType === 'player').map(f => f.entityId));

  return (
    <FavoritesContext.Provider
      value={{
        favoriteCompetitionIds, favoriteTeamIds, favoritePlayerIds, loading,
        toggleCompetition, toggleTeam, togglePlayer, reorderCompetitions, reorderTeams, refresh,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  return useContext(FavoritesContext);
}
