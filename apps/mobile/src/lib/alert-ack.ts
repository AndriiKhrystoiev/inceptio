// Local alert acknowledgement marker backed by AsyncStorage.
// Replaces the removed `postAlertAck` Worker call (Task 3.5 of
// remove-cloudflare migration) — the server read-side never existed,
// so a local flag is the complete implementation.
import AsyncStorage from '@react-native-async-storage/async-storage';

const keyOf = (alertId: string) => `alert-ack:${alertId}`;

/** Persist that the user acknowledged an alert. Idempotent. */
export async function ackAlert(alertId: string): Promise<void> {
  await AsyncStorage.setItem(keyOf(alertId), '1');
}

/** Returns true if the user has previously acknowledged this alert. */
export async function isAlertAcked(alertId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(keyOf(alertId))) === '1';
}
