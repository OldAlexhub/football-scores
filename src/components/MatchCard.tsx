import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { usePreferences } from '../state/PreferencesContext';
import { formatKickoffTime } from '../utils/dates';
import type { Match } from '../types/domain';
import { Badge } from './ui';

function TeamCrest({ initials }: { initials: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.crest, { backgroundColor: theme.colors.surfaceAlt }]}>
      <Text style={[styles.crestText, { color: theme.colors.textSecondary }]}>{initials.slice(0, 3)}</Text>
    </View>
  );
}

export function MatchCard({
  match,
  spoilerShielded,
  isFavorite,
  hasReminder,
  hasPrediction,
  onPress,
  onToggleFavorite,
  onToggleReminder,
  onAddToMatchday,
  onToggleSpoilerShield,
}: {
  match: Match;
  spoilerShielded: boolean;
  isFavorite: boolean;
  hasReminder: boolean;
  hasPrediction: boolean;
  onPress: () => void;
  onToggleFavorite?: () => void;
  onToggleReminder?: () => void;
  onAddToMatchday?: () => void;
  onToggleSpoilerShield?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { preferences } = usePreferences();

  const timeLabel = formatKickoffTime(
    match.kickoffUtc,
    match.kickoffUnknown,
    preferences.clock,
    preferences.language,
    t('common.timeNotConfirmed'),
  );

  const showScore = !spoilerShielded && (match.status === 'finished' || match.status === 'live' || match.status === 'half_time');
  const score = match.currentScore ?? match.fullTimeScore;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.competition, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {match.competitionName}
        </Text>
        <Badge
          label={t(`matchStatus.${match.status}`)}
          tone={match.status === 'live' || match.status === 'half_time' ? 'danger' : match.status === 'postponed' || match.status === 'cancelled' ? 'warning' : 'neutral'}
        />
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamCol}>
          <TeamCrest initials={match.homeTeamInitials} />
          <Text style={[styles.teamName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {match.homeTeamName}
          </Text>
        </View>

        <View style={styles.centerCol}>
          {spoilerShielded ? (
            <Text style={[styles.spoilerLabel, { color: theme.colors.warning }]}>{t('spoiler.resultHidden')}</Text>
          ) : showScore && score ? (
            <Text style={[styles.scoreText, { color: theme.colors.textPrimary }]}>
              {score.home ?? '–'} : {score.away ?? '–'}
            </Text>
          ) : (
            <Text style={[styles.timeText, { color: theme.colors.textPrimary }]}>{timeLabel}</Text>
          )}
          {match.matchweek != null ? (
            <Text style={[styles.matchweek, { color: theme.colors.textMuted }]}>
              {t('matches.matchweek', { number: match.matchweek })}
            </Text>
          ) : null}
        </View>

        <View style={styles.teamCol}>
          <TeamCrest initials={match.awayTeamInitials} />
          <Text style={[styles.teamName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {match.awayTeamName}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {onToggleFavorite ? (
          <Pressable onPress={onToggleFavorite} hitSlop={8} style={styles.actionButton}>
            <Text style={{ color: isFavorite ? theme.colors.accent : theme.colors.textMuted }}>
              {isFavorite ? '★' : '☆'}
            </Text>
          </Pressable>
        ) : null}
        {onToggleReminder ? (
          <Pressable onPress={onToggleReminder} hitSlop={8} style={styles.actionButton}>
            <Text style={{ color: hasReminder ? theme.colors.accent : theme.colors.textMuted }}>🔔</Text>
          </Pressable>
        ) : null}
        {onAddToMatchday ? (
          <Pressable onPress={onAddToMatchday} hitSlop={8} style={styles.actionButton}>
            <Text style={{ color: theme.colors.textMuted }}>🗓</Text>
          </Pressable>
        ) : null}
        {onToggleSpoilerShield ? (
          <Pressable onPress={onToggleSpoilerShield} hitSlop={8} style={styles.actionButton}>
            <Text style={{ color: spoilerShielded ? theme.colors.accent : theme.colors.textMuted }}>🛡</Text>
          </Pressable>
        ) : null}
        {hasPrediction ? (
          <View style={styles.actionButton}>
            <Text style={{ color: theme.colors.success }}>🎯</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 12, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  competition: { fontSize: 11, flex: 1, marginRight: 8 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamCol: { flex: 1, alignItems: 'center' },
  centerCol: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  crest: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  crestText: { fontSize: 11, fontWeight: '700' },
  teamName: { fontSize: 12, textAlign: 'center' },
  scoreText: { fontSize: 18, fontWeight: '800' },
  timeText: { fontSize: 14, fontWeight: '700' },
  spoilerLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  matchweek: { fontSize: 10, marginTop: 2 },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
  actionButton: { paddingHorizontal: 6, paddingVertical: 4 },
});
