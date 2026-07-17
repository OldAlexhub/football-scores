import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import type { PredictionRecord } from '../storage/repositories/predictionsRepo';
import type { WatchPlanItem } from '../types/domain';

function csvEscape(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildPredictionsCsv(predictions: PredictionRecord[]): string {
  const header = [
    'Competition', 'HomeTeam', 'AwayTeam', 'KickoffUtc', 'Outcome', 'HomeScore', 'AwayScore',
    'Confidence', 'Note', 'PointsAwarded', 'IsExactScore', 'IsCorrectOutcome', 'CreatedAt',
  ];
  const rows = predictions.map(p => [
    csvEscape(p.competitionName),
    csvEscape(p.homeTeamName),
    csvEscape(p.awayTeamName),
    csvEscape(p.kickoffUtc),
    csvEscape(p.outcome),
    csvEscape(p.homeScore),
    csvEscape(p.awayScore),
    csvEscape(p.confidence),
    csvEscape(p.note),
    csvEscape(p.pointsAwarded),
    csvEscape(p.isExactScore === null ? '' : p.isExactScore),
    csvEscape(p.isCorrectOutcome === null ? '' : p.isCorrectOutcome),
    csvEscape(p.createdAt),
  ].join(','));
  return [header.join(','), ...rows].join('\n');
}

export function buildPredictionsJson(predictions: PredictionRecord[]): string {
  return JSON.stringify(
    {
      app: 'Football Scores Today',
      generatedAtUtc: new Date().toISOString(),
      predictions,
    },
    null,
    2,
  );
}

export function buildMatchdayJson(items: WatchPlanItem[]): string {
  return JSON.stringify(
    {
      app: 'Football Scores Today',
      generatedAtUtc: new Date().toISOString(),
      watchPlanItems: items,
    },
    null,
    2,
  );
}

export interface IcsEvent {
  uid: string;
  title: string;
  description: string;
  startUtc: string;
  endUtc: string;
  location?: string;
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function toIcsDate(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Never include an advertisement, API key, or hidden/spoiler-protected result in generated calendar content. */
export function buildIcsCalendar(events: IcsEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Old Alex Hub//Football Scores Today//EN',
    'CALSCALE:GREGORIAN',
  ];
  const now = toIcsDate(new Date().toISOString());
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}@footballscorestoday`,
      `DTSTAMP:${now}`,
      `DTSTART:${toIcsDate(event.startUtc)}`,
      `DTEND:${toIcsDate(event.endUtc)}`,
      `SUMMARY:${icsEscape(event.title)}`,
      `DESCRIPTION:${icsEscape(event.description)}`,
    );
    if (event.location) {
      lines.push(`LOCATION:${icsEscape(event.location)}`);
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function safeFileName(base: string, extension: string): string {
  const sanitized = base.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').slice(0, 60);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${sanitized}-${timestamp}.${extension}`;
}

export interface WriteAndShareResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export async function writeAndShareTextFile(
  baseFileName: string,
  extension: string,
  content: string,
  mimeType: string,
): Promise<WriteAndShareResult> {
  try {
    const fileName = safeFileName(baseFileName, extension);
    const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    await RNFS.writeFile(filePath, content, 'utf8');
    await Share.open({
      url: `file://${filePath}`,
      type: mimeType,
      failOnCancel: false,
    });
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function writeTextFile(baseFileName: string, extension: string, content: string): Promise<WriteAndShareResult> {
  try {
    const fileName = safeFileName(baseFileName, extension);
    const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    await RNFS.writeFile(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function shareImageUri(uri: string): Promise<WriteAndShareResult> {
  try {
    await Share.open({ url: uri, type: 'image/png', failOnCancel: false });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
