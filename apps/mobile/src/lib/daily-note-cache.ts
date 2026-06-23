import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIBRARY_VERSION } from '@inceptio/translations';
import type { DailyNoteOutput } from '@inceptio/translations';

export function dailyNoteCacheKey(p: {
  lat: number; lng: number; dateIso: string; activity: string; locale: string;
}): string {
  return `daily-note:v1:${p.lat}:${p.lng}:${p.dateIso}:${p.activity}:${p.locale}`;
}

function libKey(key: string): string {
  return `${key}:${LIBRARY_VERSION}`;
}

export async function readDailyNote(key: string): Promise<DailyNoteOutput | null> {
  const raw = await AsyncStorage.getItem(libKey(key));
  if (!raw) return null;
  try { return JSON.parse(raw) as DailyNoteOutput; } catch { return null; }
}

export async function writeDailyNote(key: string, value: DailyNoteOutput): Promise<void> {
  await AsyncStorage.setItem(libKey(key), JSON.stringify(value));
}
