import React from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { usePreferences } from '../state/PreferencesContext';
import { formatKickoffTime } from '../utils/dates';
import { flagForCountry } from '../utils/countryFlags';
import type { Match } from '../types/domain';
import { AppIcon, type AppIconName } from './AppIcon';
import { TeamCrest } from './TeamCrest';

function Action({
  icon,
  label,
  active,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPress();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: active ? theme.colors.accentSoft : theme.colors.surfaceAlt, opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <AppIcon name={icon} size={17} color={active ? theme.colors.accent : theme.colors.textMuted} />
    </Pressable>
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
  const isLive = match.status === 'live' || match.status === 'half_time';

  const timeLabel = formatKickoffTime(
    match.kickoffUtc,
    match.kickoffUnknown,
    preferences.clock,
    preferences.language,
    t('common.timeNotConfirmed'),
  );

  const showScore = !spoilerShielded && (match.status === 'finished' || isLive);
  const score = match.currentScore ?? match.fullTimeScore;
  const statusColor = isLive
    ? theme.colors.danger
    : match.status === 'postponed' || match.status === 'cancelled'
      ? theme.colors.warning
      : theme.colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isLive ? theme.colors.danger : theme.colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.competition, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {flagForCountry(match.country)}  {match.competitionName}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: isLive ? `${theme.colors.danger}18` : theme.colors.surfaceAlt }]}>
          {isLive ? <View style={[styles.liveDot, { backgroundColor: theme.colors.danger }]} /> : null}
          <Text style={[styles.statusText, { color: statusColor }]}>{t(`matchStatus.${match.status}`)}</Text>
        </View>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamCol}>
          <TeamCrest
            uri={match.homeTeamCrestUrl}
            name={match.homeTeamName}
            initials={match.homeTeamInitials}
            size={48}
          />
          <Text style={[styles.teamName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {match.homeTeamName}
          </Text>
        </View>

        <View style={styles.centerCol}>
          {spoilerShielded ? (
            <View style={[styles.centerBadge, { backgroundColor: theme.colors.accentSoft }]}>
              <AppIcon name="shield" size={17} color={theme.colors.accent} />
              <Text style={[styles.spoilerLabel, { color: theme.colors.accent }]}>{t('spoiler.resultHidden')}</Text>
            </View>
          ) : showScore && score ? (
            <>
              <Text style={[styles.scoreText, { color: theme.colors.textPrimary }]}>
                {score.home ?? '\u2013'}<Text style={{ color: theme.colors.textMuted }}> : </Text>{score.away ?? '\u2013'}
              </Text>
              {isLive ? <Text style={[styles.liveLabel, { color: theme.colors.danger }]}>{t('matchStatus.live')}</Text> : null}
            </>
          ) : (
            <>
              <Text style={[styles.timeText, { color: theme.colors.textPrimary }]}>{timeLabel}</Text>
              <Text style={[styles.kickoffLabel, { color: theme.colors.textMuted }]}>{t('matchStatus.scheduled')}</Text>
            </>
          )}
          {match.matchweek != null ? (
            <Text style={[styles.matchweek, { color: theme.colors.textMuted }]}>
              {t('matches.matchweek', { number: match.matchweek })}
            </Text>
          ) : null}
        </View>

        <View style={styles.teamCol}>
          <TeamCrest
            uri={match.awayTeamCrestUrl}
            name={match.awayTeamName}
            initials={match.awayTeamInitials}
            size={48}
          />
          <Text style={[styles.teamName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {match.awayTeamName}
          </Text>
        </View>
      </View>

      {(onToggleFavorite || onToggleReminder || onAddToMatchday || onToggleSpoilerShield || hasPrediction) ? (
        <View style={[styles.actionsRow, { borderTopColor: theme.colors.border }]}>
          <View style={styles.actionsLeft}>
            {onToggleFavorite ? <Action icon="star" label="Favorite" active={isFavorite} onPress={onToggleFavorite} /> : null}
            {onToggleReminder ? <Action icon="bell" label={t('matches.setReminder')} active={hasReminder} onPress={onToggleReminder} /> : null}
            {onAddToMatchday ? <Action icon="bookmark" label={t('matches.addToMatchday')} onPress={onAddToMatchday} /> : null}
            {onToggleSpoilerShield ? <Action icon="shield" label={t('spoiler.title')} active={spoilerShielded} onPress={onToggleSpoilerShield} /> : null}
          </View>
          {hasPrediction ? (
            <View style={[styles.predictionBadge, { backgroundColor: theme.colors.accentSoft }]}>
              <AppIcon name="target" size={15} color={theme.colors.accent} />
              <Text style={[styles.predictionText, { color: theme.colors.accent }]}>{t('predict.title')}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  competition: { fontSize: 12, fontWeight: '700', flex: 1, marginRight: 10 },
  statusPill: { minHeight: 26, borderRadius: 13, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  teamsRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  teamCol: { flex: 1, alignItems: 'center', gap: 7 },
  centerCol: { flex: 0.9, minHeight: 74, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  teamName: { fontSize: 12, lineHeight: 16, fontWeight: '700', textAlign: 'center', minHeight: 32 },
  scoreText: { fontSize: 24, lineHeight: 30, fontWeight: '900', letterSpacing: -0.4 },
  timeText: { fontSize: 17, fontWeight: '900' },
  kickoffLabel: { fontSize: 9, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  liveLabel: { fontSize: 9, fontWeight: '900', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.7 },
  centerBadge: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, gap: 3 },
  spoilerLabel: { fontSize: 9, fontWeight: '800', textAlign: 'center' },
  matchweek: { fontSize: 9, marginTop: 4 },
  actionsRow: {
    minHeight: 49,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  predictionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, height: 28, borderRadius: 14 },
  predictionText: { fontSize: 10, fontWeight: '800' },
});
