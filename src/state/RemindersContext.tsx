import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { listReminders } from '../storage/repositories/remindersRepo';
import { cancelMatchReminder, setMatchReminder } from '../services/reminderService';
import type { Match, Reminder } from '../types/domain';

interface RemindersContextValue {
  reminders: Reminder[];
  loading: boolean;
  getReminderFor: (matchId: string) => Reminder | undefined;
  setReminder: (match: Match, offsetMinutes: number) => Promise<void>;
  cancelReminder: (matchId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const RemindersContext = createContext<RemindersContextValue>({
  reminders: [],
  loading: true,
  getReminderFor: () => undefined,
  setReminder: async () => undefined,
  cancelReminder: async () => undefined,
  refresh: async () => undefined,
});

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setReminders(await listReminders());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getReminderFor = useCallback((matchId: string) => reminders.find(r => r.matchId === matchId), [reminders]);

  const setReminder = useCallback(async (match: Match, offsetMinutes: number) => {
    await setMatchReminder(match, offsetMinutes);
    await refresh();
  }, [refresh]);

  const cancelReminder = useCallback(async (matchId: string) => {
    await cancelMatchReminder(matchId);
    await refresh();
  }, [refresh]);

  return (
    <RemindersContext.Provider value={{ reminders, loading, getReminderFor, setReminder, cancelReminder, refresh }}>
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders(): RemindersContextValue {
  return useContext(RemindersContext);
}
