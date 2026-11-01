/**
 * @format
 */

import notifee, { EventType } from '@notifee/react-native';
import { backgroundReminderSync } from './src/services/backgroundSync';
import { track } from './src/services/telemetry';
import { initDatabase } from './src/storage/db';
import { markNotificationEntry } from './src/ads/notificationEntry';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

AppRegistry.registerHeadlessTask('FootballReminderSync', () => backgroundReminderSync);
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    markNotificationEntry();
    await initDatabase();
    track('reminder_opened', { entityId: String(detail.notification?.data?.matchId || '') });
  }
});
