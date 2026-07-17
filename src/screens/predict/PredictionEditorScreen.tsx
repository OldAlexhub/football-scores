import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardSafeScreen } from '../../components/KeyboardSafeScreen';
import { SafeScrollView } from '../../components/SafeScrollView';
import { SafeStickyAction } from '../../components/SafeStickyAction';
import { PrimaryButton, SecondaryButton, DangerButton } from '../../components/ui';
import { useSuppressBanner } from '../../ads/useSuppressBanner';
import { maybeShowInterstitial } from '../../ads/InterstitialManager';
import type { MatchDetailsParams } from '../../navigation/types';
import { usePredictions } from '../../state/PredictionsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { outcomeFromScoreInputs, validatePrediction } from '../../services/predictionScoring';
import type { PredictionOutcome } from '../../types/domain';

export function PredictionEditorScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const params = route.params as MatchDetailsParams;
  const { getPredictionFor, save, remove } = usePredictions();

  useSuppressBanner();

  const existing = getPredictionFor(params.matchId);
  const [homeScore, setHomeScore] = useState(existing ? String(existing.homeScore) : '');
  const [awayScore, setAwayScore] = useState(existing ? String(existing.awayScore) : '');
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(existing?.confidence ?? 3);
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const kickoffPassed = params.match?.kickoffUtc ? new Date(params.match.kickoffUtc).getTime() <= Date.now() : false;
  const isLocked = !!existing?.lockedAtUtc && new Date(existing.lockedAtUtc).getTime() <= Date.now();

  const [outcome, setOutcome] = useState<PredictionOutcome>(existing?.outcome ?? 'home');

  useEffect(() => {
    const h = parseInt(homeScore, 10);
    const a = parseInt(awayScore, 10);
    if (!Number.isNaN(h) && !Number.isNaN(a)) {
      setOutcome(outcomeFromScoreInputs(h, a));
    }
  }, [homeScore, awayScore]);

  const handleSave = async () => {
    if (!params.match) return;
    const h = parseInt(homeScore, 10);
    const a = parseInt(awayScore, 10);
    const validation = validatePrediction({ outcome, homeScore: h, awayScore: a });
    if (!validation.valid) {
      setError(t(validation.errorKey as string));
      return;
    }
    const finalize = async () => {
      await save(params.match as NonNullable<typeof params.match>, { outcome, homeScore: h, awayScore: a, confidence, note });
      await maybeShowInterstitial('prediction_save_milestone');
      navigation.goBack();
    };
    if (existing) {
      Alert.alert(t('predict.duplicateWarning'), '', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: finalize },
      ]);
    } else {
      await finalize();
    }
  };

  const handleDelete = () => {
    Alert.alert(t('predict.deleteConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { await remove(params.matchId); navigation.goBack(); } },
    ]);
  };

  if (kickoffPassed || isLocked) {
    return (
      <KeyboardSafeScreen>
        <View style={styles.lockedBox}>
          <Text style={{ color: theme.colors.warning, textAlign: 'center' }}>{t('predict.lockedNotice')}</Text>
        </View>
      </KeyboardSafeScreen>
    );
  }

  return (
    <KeyboardSafeScreen>
      <SafeScrollView>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('predict.title')}</Text>

        <View style={styles.outcomeRow}>
          {(['home', 'draw', 'away'] as PredictionOutcome[]).map(o => (
            <Pressable
              key={o}
              onPress={() => setOutcome(o)}
              style={[styles.outcomeChip, { backgroundColor: outcome === o ? theme.colors.accent : theme.colors.surfaceAlt }]}
            >
              <Text style={{ color: outcome === o ? theme.colors.accentText : theme.colors.textSecondary, fontWeight: '600' }}>
                {t(`predict.${o}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('predict.exactScore')}</Text>
        <View style={styles.scoreRow}>
          <TextInput
            value={homeScore}
            onChangeText={setHomeScore}
            keyboardType="number-pad"
            maxLength={2}
            style={[styles.scoreInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
          />
          <Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>:</Text>
          <TextInput
            value={awayScore}
            onChangeText={setAwayScore}
            keyboardType="number-pad"
            maxLength={2}
            style={[styles.scoreInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
          />
        </View>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('predict.confidence')}</Text>
        <View style={styles.confidenceRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <Pressable key={n} onPress={() => setConfidence(n as 1 | 2 | 3 | 4 | 5)} hitSlop={6}>
              <Text style={{ fontSize: 22, color: n <= confidence ? theme.colors.accent : theme.colors.border }}>★</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('predict.note')}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          style={[styles.noteInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
        />

        {error ? <Text style={{ color: theme.colors.danger, paddingHorizontal: 16, marginTop: 8 }}>{error}</Text> : null}
      </SafeScrollView>
      <SafeStickyAction>
        {existing ? <DangerButton label={t('common.delete')} onPress={handleDelete} style={{ marginBottom: 10 }} /> : null}
        <PrimaryButton label={t('common.save')} onPress={handleSave} />
        <SecondaryButton label={t('common.cancel')} onPress={() => navigation.goBack()} style={{ marginTop: 10 }} />
      </SafeStickyAction>
    </KeyboardSafeScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, marginBottom: 12 },
  outcomeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  outcomeChip: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', paddingHorizontal: 16, marginTop: 18, marginBottom: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  scoreInput: { width: 60, textAlign: 'center', fontSize: 20, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 8 },
  confidenceRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  noteInput: { marginHorizontal: 16, minHeight: 70, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10, textAlignVertical: 'top' },
  lockedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
