import { NativeModules } from 'react-native';
/** Only debug builds accept a local API override; releases always use Nexus. */
export const SERVER_ORIGIN: string = NativeModules.FootballRuntime?.apiOrigin || 'https://soccer.server.oldalexhub.com';
export const API_BASE_URL = `${SERVER_ORIGIN}/api/v1`;
export const APP_VERSION = '2.0.0';
