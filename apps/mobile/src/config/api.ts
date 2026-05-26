import { Platform } from 'react-native';

// Dev defaults per platform:
//   - iOS Simulator: localhost works natively
//   - Android emulator: 10.0.2.2 is the host machine's loopback
//   - Physical device on the same Wi-Fi: replace with your Mac's LAN IP
//     (e.g. `http://192.168.1.42:8787`). Find it with: ipconfig getifaddr en0
const WORKER_URL_DEV =
  Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://localhost:8787';

// Cold-cache upstream calls take up to 42s per CLAUDE.md → "Real API behavior".
// The Worker has its own 60s upstream guard; we mirror it here so the fetch
// doesn't time out before the Worker responds.
const TIMEOUT_MS = 60_000;

export const API_CONFIG = {
  baseUrl: __DEV__ ? WORKER_URL_DEV : 'https://api.inceptio.app', // prod URL TBD
  timeout: TIMEOUT_MS,
} as const;
