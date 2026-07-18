import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon, type AppIconName } from '../../components/AppIcon';
import { TeamCrest } from '../../components/TeamCrest';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, ErrorState, LoadingState, SecondaryButton } from '../../components/ui';
import {
  fetchForm,
  fetchHeadToHead,
  fetchMatchAnalysis,
  fetchMatchPrediction,
  resolveMatchById,
} from '../../providers/providerManager';
import type { MatchDetailsParams, MatchesStackParamList } from '../../navigation/types';
import { usePreferences } from '../../state/PreferencesContext';
import { useReminders } from '../../state/RemindersContext';
import { useTheme } from '../../theme/ThemeProvider';
import { formatKickoffDate, formatKickoffTime } from '../../utils/dates';
import type { LineupPlayer, Match, MatchAnalysis, MatchEventType, MatchPrediction, MatchStatistic } from '../../types/domain';

const ANALYSIS_SOURCE_LABEL = {
  espn: 'ESPN',
  'api-football': 'API-Football',
  thesportsdb: 'TheSportsDB',
  'football-data-org': 'football-data.org',
  openfootball: 'OpenFootball',
  cached: 'Saved data',
} as const;

type Nav = NativeStackNavigationProp<MatchesStackParamList, 'MatchDetails'>;

function providerPart(id: string): string {
  const separator = id.indexOf(':');
  return separator === -1 ? id : id.slice(separator + 1);
}

function SectionTitle({ icon, title }: { icon: AppIconName; title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionIcon, { backgroundColor: theme.colors.accentSoft }]}>
        <AppIcon name={icon} size={18} color={theme.colors.accent} />
      </View>
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
    </View>
  );
}

function ProbabilityBar({ prediction }: { prediction: MatchPrediction }) {
  const theme = useTheme();
  return (
    <>
      <View style={[styles.probabilityTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
        <View style={{ flex: prediction.homeWinPercent, backgroundColor: theme.colors.accent }} />
        <View style={{ flex: prediction.drawPercent, backgroundColor: theme.colors.warning }} />
        <View style={{ flex: prediction.awayWinPercent, backgroundColor: theme.colors.textSecondary }} />
      </View>
      <View style={styles.probabilityLabels}>
        <Probability label="Home" value={prediction.homeWinPercent} color={theme.colors.accent} />
        <Probability label="Draw" value={prediction.drawPercent} color={theme.colors.warning} />
        <Probability label="Away" value={prediction.awayWinPercent} color={theme.colors.textSecondary} />
      </View>
    </>
  );
}

function Probability({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.probabilityItem}>
      <Text style={[styles.probabilityValue, { color }]}>{value}%</Text>
      <Text style={[styles.probabilityName, { color }]}>{label}</Text>
    </View>
  );
}

function eventIcon(type: MatchEventType): AppIconName {
  if (type === 'goal') return 'ball';
  if (type === 'card') return 'bookmark';
  if (type === 'substitution') return 'users';
  if (type === 'var') return 'alert';
  return 'clock';
}

export function MatchDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const theme = useTheme();
  const isFocused = useIsFocused();
  const params = route.params as MatchDetailsParams;
  const { preferences } = usePreferences();
  const { getReminderFor, setReminder, cancelReminder } = useReminders();

  const [match, setMatch] = useState<Match | null>(params.match ?? null);
  const [loading, setLoading] = useState(!params.match);
  const [notFound, setNotFound] = useState(false);
  const [h2h, setH2h] = useState<{ matches: Match[]; totalMeetings: number } | null>(null);
  const [homeForm, setHomeForm] = useState<string[]>([]);
  const [awayForm, setAwayForm] = useState<string[]>([]);
  const [modelPrediction, setModelPrediction] = useState<MatchPrediction | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    if (params.match) return;
    let mounted = true;
    setLoading(true);
    resolveMatchById(params.matchId).then(result => {
      if (!mounted) return;
      if (result) setMatch(result);
      else setNotFound(true);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [params.matchId, params.match]);

  useEffect(() => {
    if (!match) return;
    let mounted = true;
    setInsightsLoading(true);
    const homeId = providerPart(match.homeTeamId);
    const awayId = providerPart(match.awayTeamId);
    const tasks: Promise<void>[] = [
      fetchHeadToHead(homeId, awayId).then(result => { if (mounted) setH2h(result.data); }),
      fetchForm(homeId).then(result => { if (mounted) setHomeForm(result.data.lastFive); }),
      fetchForm(awayId).then(result => { if (mounted) setAwayForm(result.data.lastFive); }),
    ];
    if (match.status === 'scheduled') {
      tasks.push(fetchMatchPrediction(match).then(result => { if (mounted) setModelPrediction(result); }));
    }
    tasks.push(fetchMatchAnalysis(match).then(result => { if (mounted) setAnalysis(result); }));
    Promise.allSettled(tasks).then(() => { if (mounted) setInsightsLoading(false); });
    return () => { mounted = false; };
  }, [match]);

  useEffect(() => {
    if (!match || !isFocused || (match.status !== 'live' && match.status !== 'half_time')) return;
    let mounted = true;
    const refreshLiveMatch = async () => {
      const refreshed = await resolveMatchById(match.id);
      if (!mounted || !refreshed) return;
      setMatch(refreshed);
      const refreshedAnalysis = await fetchMatchAnalysis(refreshed);
      if (mounted) setAnalysis(refreshedAnalysis);
    };
    const timer = setInterval(() => { void refreshLiveMatch(); }, 30_000);
    return () => { mounted = false; clearInterval(timer); };
  }, [isFocused, match]);

  if (loading) {
    return <ScreenContainer><LoadingState label={t('common.loading')} /></ScreenContainer>;
  }

  if (notFound || !match) {
    return (
      <ScreenContainer>
        <ErrorState message={t('common.dataUnavailable')} retryLabel={t('common.back')} onRetry={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const reminder = getReminderFor(match.id);
  const timeLabel = formatKickoffTime(match.kickoffUtc, match.kickoffUnknown, preferences.clock, preferences.language, t('common.timeNotConfirmed'));
  const dateLabel = match.kickoffUtc ? formatKickoffDate(match.kickoffUtc, preferences.language) : t('common.unknown');
  const score = match.currentScore ?? match.fullTimeScore;
  const isLive = match.status === 'live' || match.status === 'half_time';

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={24}>
        <View style={styles.hero}>
          <Text style={[styles.competition, { color: theme.colors.textSecondary }]}>{match.competitionName}</Text>
          <View style={styles.heroTeams}>
            <View style={styles.heroTeam}>
              <TeamCrest uri={match.homeTeamCrestUrl} name={match.homeTeamName} initials={match.homeTeamInitials} size={66} />
              <Text style={[styles.heroTeamName, { color: theme.colors.textPrimary }]} numberOfLines={2}>{match.homeTeamName}</Text>
            </View>
            <View style={styles.heroCenter}>
              {score ? (
                <Text style={[styles.heroScore, { color: theme.colors.textPrimary }]}>{score.home ?? '\u2013'} : {score.away ?? '\u2013'}</Text>
              ) : (
                <Text style={[styles.heroTime, { color: theme.colors.textPrimary }]}>{timeLabel}</Text>
              )}
              <View style={[styles.statusBadge, { backgroundColor: isLive ? `${theme.colors.danger}18` : theme.colors.surfaceAlt }]}>
                {isLive ? <View style={[styles.liveDot, { backgroundColor: theme.colors.danger }]} /> : null}
                <Text style={[styles.statusLabel, { color: isLive ? theme.colors.danger : theme.colors.textMuted }]}>
                  {isLive && match.elapsedMinutes != null ? `${match.elapsedMinutes}${match.injuryTimeMinutes ? `+${match.injuryTimeMinutes}` : ''}'` : t(`matchStatus.${match.status}`)}
                </Text>
              </View>
            </View>
            <View style={styles.heroTeam}>
              <TeamCrest uri={match.awayTeamCrestUrl} name={match.awayTeamName} initials={match.awayTeamInitials} size={66} />
              <Text style={[styles.heroTeamName, { color: theme.colors.textPrimary }]} numberOfLines={2}>{match.awayTeamName}</Text>
            </View>
          </View>
          <Text style={[styles.dateTime, { color: theme.colors.textMuted }]}>{dateLabel}  ·  {timeLabel}</Text>
        </View>

        {modelPrediction ? (
          <Card style={styles.section}>
            <SectionTitle icon="spark" title={t('matchDetails.predictedScore')} />
            <View style={styles.predictedScoreRow}>
              <Text style={[styles.predictedTeam, { color: theme.colors.textSecondary }]} numberOfLines={1}>{match.homeTeamName}</Text>
              <Text style={[styles.predictedScore, { color: theme.colors.textPrimary }]}>{modelPrediction.predictedHomeGoals} : {modelPrediction.predictedAwayGoals}</Text>
              <Text style={[styles.predictedTeam, { color: theme.colors.textSecondary }]} numberOfLines={1}>{match.awayTeamName}</Text>
            </View>
            <ProbabilityBar prediction={modelPrediction} />
            {modelPrediction.advice ? <Text style={[styles.advice, { color: theme.colors.textSecondary }]}>{modelPrediction.advice}</Text> : null}
            <View style={[styles.modelMeta, { backgroundColor: theme.colors.surfaceAlt }]}>
              <AppIcon name="chart" size={15} color={theme.colors.textMuted} />
              <Text style={[styles.modelMetaText, { color: theme.colors.textMuted }]}>
                {t('matchDetails.modelConfidence', { percent: modelPrediction.confidencePercent })} · {modelPrediction.source === 'provider_model' ? 'API-Football' : t('matchDetails.formModel')}
              </Text>
            </View>
            <Text style={[styles.disclaimer, { color: theme.colors.textMuted }]}>{t('matchDetails.predictionDisclaimer')}</Text>
          </Card>
        ) : null}

        {(analysis || insightsLoading) && (match.status !== 'scheduled' || !!analysis?.lineups.length) ? (
          <Card style={styles.section}>
            <SectionTitle
              icon={isLive ? 'ball' : 'chart'}
              title={isLive ? t('matchDetails.liveMatchCenter') : match.status === 'finished' ? t('matchDetails.analysis') : t('matchDetails.preMatchBriefing')}
            />
            {analysis?.hasExtendedData ? (
              <Text style={[styles.analysisSource, { color: theme.colors.textMuted }]}>
                {t('matches.activeSource', { provider: ANALYSIS_SOURCE_LABEL[analysis.providerId] })}
              </Text>
            ) : null}
            {insightsLoading ? <Text style={[styles.loadingInline, { color: theme.colors.textMuted }]}>{t('common.loading')}</Text> : null}
            {analysis?.summary.length ? (
              <View style={styles.summaryList}>
                {analysis.summary.map((item, index) => (
                  <View key={`${index}:${item}`} style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: theme.colors.accent }]} />
                    <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {analysis?.statistics.length ? (
              <View style={styles.analysisBlock}>
                <Text style={[styles.subheading, { color: theme.colors.textPrimary }]}>{t('matchDetails.matchStatistics')}</Text>
                {analysis.statistics.map(stat => <StatComparison key={stat.key} statistic={stat} />)}
              </View>
            ) : null}

            {analysis?.events.length ? (
              <View style={styles.analysisBlock}>
                <Text style={[styles.subheading, { color: theme.colors.textPrimary }]}>{t('matchDetails.timeline')}</Text>
                {analysis.events.map(event => (
                  <View key={event.id} style={styles.eventRow}>
                    <Text style={[styles.eventTime, { color: theme.colors.accent }]}>{event.minute}{event.extraMinute ? `+${event.extraMinute}` : ''}'</Text>
                    <View style={[styles.eventIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                      <AppIcon name={eventIcon(event.type)} size={15} color={theme.colors.textSecondary} />
                    </View>
                    <View style={styles.eventTextBlock}>
                      <Text style={[styles.eventPlayer, { color: theme.colors.textPrimary }]}>{event.playerName ?? event.teamName}</Text>
                      <Text style={[styles.eventDetail, { color: theme.colors.textMuted }]}>{event.detail}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {analysis?.topPerformers.length ? (
              <View style={styles.analysisBlock}>
                <Text style={[styles.subheading, { color: theme.colors.textPrimary }]}>{t('matchDetails.topPerformers')}</Text>
                {analysis.topPerformers.map(player => (
                  <View key={player.playerId} style={styles.playerRow}>
                    {player.playerPhotoUrl ? <Image source={{ uri: player.playerPhotoUrl }} style={styles.playerPhoto} /> : (
                      <View style={[styles.playerPhoto, styles.playerFallback, { backgroundColor: theme.colors.surfaceAlt }]}><AppIcon name="users" size={18} color={theme.colors.textMuted} /></View>
                    )}
                    <View style={styles.playerText}>
                      <Text style={[styles.playerName, { color: theme.colors.textPrimary }]}>{player.playerName}</Text>
                      <Text style={[styles.playerMeta, { color: theme.colors.textMuted }]}>{player.teamName} · {player.goals} G · {player.assists} A</Text>
                    </View>
                    {player.rating != null ? <Text style={[styles.rating, { color: theme.colors.accent, backgroundColor: theme.colors.accentSoft }]}>{player.rating.toFixed(1)}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}

            {analysis?.lineups.length ? (
              <View style={styles.analysisBlock}>
                <Text style={[styles.subheading, { color: theme.colors.textPrimary }]}>{t('matchDetails.lineups')}</Text>
                {analysis.lineups.map(lineup => (
                  <View key={lineup.teamId} style={styles.lineupBlock}>
                    <View style={styles.lineupHeader}>
                      <TeamCrest uri={lineup.teamCrestUrl} name={lineup.teamName} size={30} />
                      <Text style={[styles.lineupTeam, { color: theme.colors.textPrimary }]}>{lineup.teamName}</Text>
                      <Text style={[styles.formation, { color: theme.colors.accent }]}>{lineup.formation ?? ''}</Text>
                    </View>
                    <FormationPitch players={lineup.starters} />
                    {lineup.coachName ? (
                      <Text style={[styles.coachName, { color: theme.colors.textMuted }]}>{t('matchDetails.coach')}: {lineup.coachName}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {analysis && !analysis.hasExtendedData ? (
              <View style={[styles.unavailable, { backgroundColor: theme.colors.surfaceAlt }]}>
                <AppIcon name="alert" size={18} color={theme.colors.warning} />
                <Text style={[styles.unavailableText, { color: theme.colors.textSecondary }]}>{t('matchDetails.detailedUnavailable')}</Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {(homeForm.length > 0 || awayForm.length > 0) ? (
          <Card style={styles.section}>
            <SectionTitle icon="chart" title={t('matchDetails.recentForm')} />
            <FormRow team={match.homeTeamName} form={homeForm} />
            <FormRow team={match.awayTeamName} form={awayForm} />
          </Card>
        ) : null}

        <Card style={styles.section}>
          <SectionTitle icon="users" title={t('matchDetails.headToHead')} />
          {h2h?.matches.length ? h2h.matches.slice(0, 5).map(item => (
            <View key={item.id} style={[styles.h2hRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.h2hDate, { color: theme.colors.textMuted }]}>{formatKickoffDate(item.kickoffUtc ?? new Date().toISOString(), preferences.language)}</Text>
              <Text style={[styles.h2hResult, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {item.fullTimeScore ? `${item.homeTeamName} ${item.fullTimeScore.home}-${item.fullTimeScore.away} ${item.awayTeamName}` : t('common.dataUnavailable')}
              </Text>
            </View>
          )) : <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{t('matchDetails.noHeadToHead')}</Text>}
        </Card>

        <Card style={styles.section}>
          <SectionTitle icon="settings" title={t('matchDetails.matchInformation')} />
          <InfoRow label={t('matchDetails.venue')} value={match.venue ?? t('common.dataUnavailable')} />
          {match.referee ? <InfoRow label={t('matchDetails.referee')} value={match.referee} /> : null}
          {match.attendance != null ? <InfoRow label={t('matchDetails.attendance')} value={match.attendance.toLocaleString()} /> : null}
          <InfoRow label={t('matchDetails.dataSource', { provider: '' }).trim()} value={match.attribution} />
          {match.lastProviderUpdateUtc ? <InfoRow label={t('matchDetails.lastUpdated', { time: '' }).trim()} value={new Date(match.lastProviderUpdateUtc).toLocaleString()} /> : null}
        </Card>

        {match.status === 'scheduled' ? <View style={styles.actionsGrid}>
          <SecondaryButton
            label={reminder?.status === 'scheduled' ? t('matches.cancelReminder') : t('matches.setReminder')}
            onPress={() => reminder?.status === 'scheduled' ? cancelReminder(match.id) : setReminder(match, preferences.defaultReminderOffsetMinutes)}
            style={styles.actionButton}
          />
        </View> : null}
      </SafeScrollView>
    </ScreenContainer>
  );
}

function FormRow({ team, form }: { team: string; form: string[] }) {
  const theme = useTheme();
  return (
    <View style={styles.formRow}>
      <Text style={[styles.formTeam, { color: theme.colors.textSecondary }]} numberOfLines={1}>{team}</Text>
      <View style={styles.formPills}>
        {form.map((result, index) => {
          const color = result === 'W' ? theme.colors.success : result === 'L' ? theme.colors.danger : theme.colors.warning;
          return <Text key={`${result}:${index}`} style={[styles.formPill, { color: theme.colors.accentText, backgroundColor: color }]}>{result}</Text>;
        })}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function numericValue(value: MatchStatistic['homeValue']): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = Number.parseFloat(value.replace('%', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function StatComparison({ statistic }: { statistic: MatchStatistic }) {
  const theme = useTheme();
  const home = numericValue(statistic.homeValue);
  const away = numericValue(statistic.awayValue);
  const total = Math.max(1, (home ?? 0) + (away ?? 0));
  return (
    <View style={[styles.statComparison, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.statNumbers}>
        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{statistic.homeValue ?? '\u2013'}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{statistic.label}</Text>
        <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{statistic.awayValue ?? '\u2013'}</Text>
      </View>
      {home != null && away != null ? (
        <View style={[styles.statTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
          <View style={{ flex: home / total, backgroundColor: theme.colors.accent }} />
          <View style={{ flex: away / total, backgroundColor: theme.colors.textSecondary }} />
        </View>
      ) : null}
    </View>
  );
}

function FormationPitch({ players }: { players: LineupPlayer[] }) {
  const theme = useTheme();
  const rows = new Map<number, LineupPlayer[]>();
  players.forEach((player, index) => {
    const row = Number.parseInt(player.grid?.split(':')[0] ?? '', 10);
    const rowNumber = Number.isFinite(row) ? row : Math.floor(index / 3) + 1;
    rows.set(rowNumber, [...(rows.get(rowNumber) ?? []), player]);
  });
  return (
    <View style={[styles.pitch, { backgroundColor: theme.colors.accent }]}>
      <View style={styles.halfwayLine} />
      {[...rows.entries()].sort(([a], [b]) => a - b).map(([row, rowPlayers]) => (
        <View key={row} style={styles.pitchRow}>
          {rowPlayers.map(player => (
            <View key={player.id} style={styles.pitchPlayer}>
              <View style={[styles.playerNumber, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.playerNumberText, { color: theme.colors.accent }]}>{player.number ?? '\u2022'}</Text>
              </View>
              <Text style={styles.pitchPlayerName} numberOfLines={1}>{player.name.split(' ').pop()}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 5, alignItems: 'center' },
  competition: { fontSize: 12, fontWeight: '800', marginBottom: 15 },
  heroTeams: { width: '100%', flexDirection: 'row', alignItems: 'flex-start' },
  heroTeam: { flex: 1, alignItems: 'center', gap: 8 },
  heroTeamName: { minHeight: 38, fontSize: 14, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  heroCenter: { flex: 0.88, minHeight: 92, alignItems: 'center', justifyContent: 'center' },
  heroScore: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.5 },
  heroTime: { fontSize: 19, fontWeight: '900' },
  statusBadge: { marginTop: 7, minHeight: 26, paddingHorizontal: 10, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  dateTime: { fontSize: 12, fontWeight: '600', marginTop: 7 },
  section: { marginHorizontal: 16, marginTop: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '900', flex: 1 },
  sectionAction: { marginTop: 10 },
  predictedScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  predictedTeam: { flex: 1, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  predictedScore: { fontSize: 27, fontWeight: '900' },
  probabilityTrack: { height: 9, borderRadius: 5, overflow: 'hidden', flexDirection: 'row' },
  probabilityLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  probabilityItem: { alignItems: 'center' },
  probabilityValue: { fontSize: 13, fontWeight: '900' },
  probabilityName: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  advice: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 14, fontWeight: '600' },
  modelMeta: { minHeight: 34, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 13, paddingHorizontal: 8 },
  modelMetaText: { fontSize: 10, fontWeight: '700' },
  disclaimer: { fontSize: 9, lineHeight: 13, textAlign: 'center', marginTop: 8 },
  loadingInline: { fontSize: 12, textAlign: 'center', paddingVertical: 10 },
  summaryList: { gap: 10 },
  summaryItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  summaryDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  summaryText: { flex: 1, fontSize: 13, lineHeight: 19 },
  analysisBlock: { marginTop: 20 },
  analysisSource: { fontSize: 9, fontWeight: '700', marginTop: -4, marginBottom: 10 },
  subheading: { fontSize: 14, fontWeight: '900', marginBottom: 9 },
  statRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  statComparison: { minHeight: 55, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 7 },
  statNumbers: { flexDirection: 'row', alignItems: 'center' },
  statTrack: { height: 5, flexDirection: 'row', borderRadius: 3, overflow: 'hidden', marginHorizontal: 10, marginTop: 5 },
  statValue: { width: 60, textAlign: 'center', fontSize: 13, fontWeight: '900' },
  statLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  eventRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center' },
  eventTime: { width: 42, fontSize: 12, fontWeight: '900' },
  eventIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  eventTextBlock: { flex: 1 },
  eventPlayer: { fontSize: 12, fontWeight: '800' },
  eventDetail: { fontSize: 10, marginTop: 2 },
  playerRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerPhoto: { width: 38, height: 38, borderRadius: 19 },
  playerFallback: { alignItems: 'center', justifyContent: 'center' },
  playerText: { flex: 1 },
  playerName: { fontSize: 12, fontWeight: '800' },
  playerMeta: { fontSize: 10, marginTop: 2 },
  rating: { minWidth: 40, paddingVertical: 5, borderRadius: 9, textAlign: 'center', fontSize: 12, fontWeight: '900' },
  lineupBlock: { marginBottom: 14 },
  lineupHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 7 },
  lineupTeam: { flex: 1, fontSize: 13, fontWeight: '900' },
  formation: { fontSize: 12, fontWeight: '900' },
  lineupNames: { fontSize: 11, lineHeight: 18 },
  coachName: { fontSize: 10, fontWeight: '700', marginTop: 8 },
  pitch: { minHeight: 228, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, justifyContent: 'space-around', overflow: 'hidden' },
  halfwayLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: StyleSheet.hairlineWidth, backgroundColor: '#FFFFFF88' },
  pitchRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  pitchPlayer: { flex: 1, maxWidth: 72, alignItems: 'center' },
  playerNumber: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  playerNumberText: { fontSize: 9, fontWeight: '900' },
  pitchPlayerName: { color: '#FFFFFF', fontSize: 8, fontWeight: '800', marginTop: 2, maxWidth: 70 },
  unavailable: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, padding: 12, marginTop: 12 },
  unavailableText: { flex: 1, fontSize: 11, lineHeight: 16 },
  formRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTeam: { flex: 1, fontSize: 12, fontWeight: '700', marginRight: 10 },
  formPills: { flexDirection: 'row', gap: 5 },
  formPill: { width: 25, height: 25, borderRadius: 8, textAlign: 'center', textAlignVertical: 'center', fontSize: 10, fontWeight: '900' },
  h2hRow: { minHeight: 45, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  h2hDate: { width: 68, fontSize: 10, fontWeight: '700' },
  h2hResult: { flex: 1, fontSize: 11, fontWeight: '700' },
  emptyText: { fontSize: 12, lineHeight: 18 },
  infoRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  infoLabel: { flex: 1, fontSize: 11, fontWeight: '700' },
  infoValue: { flex: 1.4, fontSize: 11, lineHeight: 16, fontWeight: '700', textAlign: 'right' },
  actionsGrid: { marginHorizontal: 16, marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionButton: { flex: 1, minWidth: 145 },
  fullAction: { width: '100%' },
  followRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  followName: { flex: 1, fontSize: 13, fontWeight: '800' },
});
