import React, { useMemo, useState } from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppIcon } from './AppIcon';
import { addDays, startOfLocalDay } from '../utils/dates';

interface Props {
  value?: Date | null;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  mode: 'single' | 'range';
  onSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
}

function sameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function MonthCalendar({ value, rangeStart, rangeEnd, mode, onSelect, minDate, maxDate, locale = 'en-US' }: Props) {
  const theme = useTheme();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value ?? rangeStart ?? new Date()));

  const weekdayLabels = useMemo(() => {
    const base = new Date(2023, 0, 1); // a Sunday
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(addDays(base, i)),
    );
  }, [locale]);

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const leading = first.getDay();
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const list: (Date | null)[] = [];
    for (let i = 0; i < leading; i += 1) list.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) list.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [viewMonth]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(viewMonth);
  const min = minDate ? startOfLocalDay(minDate).getTime() : -Infinity;
  const max = maxDate ? startOfLocalDay(maxDate).getTime() : Infinity;
  const rangeLo = rangeStart ? startOfLocalDay(rangeStart).getTime() : null;
  const rangeHi = rangeEnd ? startOfLocalDay(rangeEnd).getTime() : null;

  const shiftMonth = (delta: number) =>
    setViewMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  return (
    <View>
      <View style={[styles.header, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={10} onPress={() => shiftMonth(-1)} style={styles.navBtn}>
          <View style={{ transform: [{ rotate: I18nManager.isRTL ? '0deg' : '180deg' }] }}>
            <AppIcon name="chevronRight" size={20} color={theme.colors.textSecondary} />
          </View>
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.colors.textPrimary }]}>{monthLabel}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={10} onPress={() => shiftMonth(1)} style={styles.navBtn}>
          <View style={{ transform: [{ rotate: I18nManager.isRTL ? '180deg' : '0deg' }] }}>
            <AppIcon name="chevronRight" size={20} color={theme.colors.textSecondary} />
          </View>
        </Pressable>
      </View>

      <View style={[styles.weekRow, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}>
        {weekdayLabels.map((label, index) => (
          <Text key={index} style={[styles.weekday, { color: theme.colors.textMuted }]}>{label}</Text>
        ))}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} style={[styles.weekRow, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}>
          {cells.slice(week * 7, week * 7 + 7).map((cell, index) => {
            if (!cell) return <View key={index} style={styles.cell} />;
            const time = startOfLocalDay(cell).getTime();
            const disabled = time < min || time > max;
            const selectedSingle = mode === 'single' && sameDay(cell, value);
            const isStart = mode === 'range' && rangeLo != null && time === rangeLo;
            const isEnd = mode === 'range' && rangeHi != null && time === rangeHi;
            const inRange = mode === 'range' && rangeLo != null && rangeHi != null && time > rangeLo && time < rangeHi;
            const highlighted = selectedSingle || isStart || isEnd;
            return (
              <Pressable
                key={index}
                disabled={disabled}
                onPress={() => onSelect(startOfLocalDay(cell))}
                accessibilityRole="button"
                accessibilityState={{ selected: highlighted, disabled }}
                style={[
                  styles.cell,
                  inRange && { backgroundColor: theme.colors.accentSoft },
                  isStart && { backgroundColor: theme.colors.accentSoft, borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
                  isEnd && { backgroundColor: theme.colors.accentSoft, borderTopRightRadius: 999, borderBottomRightRadius: 999 },
                ]}
              >
                <View style={[styles.dayPill, highlighted && { backgroundColor: theme.colors.accent }]}>
                  <Text
                    style={[
                      styles.dayText,
                      { color: highlighted ? theme.colors.accentText : disabled ? theme.colors.textMuted : theme.colors.textPrimary },
                    ]}
                  >
                    {cell.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 15, fontWeight: '800' },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingVertical: 6 },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayPill: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13, fontWeight: '700' },
});
