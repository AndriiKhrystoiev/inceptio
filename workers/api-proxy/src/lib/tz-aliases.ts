// IANA tz database backward-link aliases — legacy zone names → canonical names.
// Sourced from the IANA tz `backward` file (current as of tzdata 2024a).
// https://github.com/eggert/tz/blob/main/backward
//
// Embedded inline (not fetched) so the Worker has no runtime dependency on
// tzdata bundles. This subset is the complete set of "Link" entries from the
// backward file — about 135 pairs. Mapping is LEGACY -> CANONICAL.
//
// Spec context: Real-data testing exposed `Europe/Kiev` (legacy) vs
// `Europe/Kyiv` (canonical post-2022b) firing the mismatch counter on
// otherwise-identical zones. Per user instruction (2026-06-03), use this
// explicit map; do NOT use Intl.resolvedOptions for canonicalization
// (inconsistent across V8 versions / runtimes).
//
// When the IANA backward file is updated (rare — ~once a year for renames
// and deprecations), add new pairs here in the same PR. The fragment will
// be small and the existing tests will catch regressions.

const ALIAS_TO_CANONICAL: Record<string, string> = {
  // Recent renames (2022b — Ukraine, 2024a et al.)
  'Europe/Kiev': 'Europe/Kyiv',
  'Europe/Uzhgorod': 'Europe/Kyiv',
  'Europe/Zaporozhye': 'Europe/Kyiv',

  // Long-standing renames
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Macao': 'Asia/Macau',
  'Asia/Dacca': 'Asia/Dhaka',
  'Asia/Thimbu': 'Asia/Thimphu',
  'Asia/Istanbul': 'Europe/Istanbul',
  'Asia/Ashkhabad': 'Asia/Ashgabat',
  'Asia/Ujung_Pandang': 'Asia/Makassar',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'America/Argentina/ComodRivadavia': 'America/Argentina/Catamarca',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'America/Catamarca': 'America/Argentina/Catamarca',
  'America/Cordoba': 'America/Argentina/Cordoba',
  'America/Jujuy': 'America/Argentina/Jujuy',
  'America/Mendoza': 'America/Argentina/Mendoza',
  'America/Rosario': 'America/Argentina/Cordoba',
  'America/Indianapolis': 'America/Indiana/Indianapolis',
  'America/Knox_IN': 'America/Indiana/Knox',
  'America/Louisville': 'America/Kentucky/Louisville',
  'America/Porto_Acre': 'America/Rio_Branco',
  'America/Virgin': 'America/Port_of_Spain',
  'America/Coral_Harbour': 'America/Atikokan',
  'America/Ensenada': 'America/Tijuana',
  'America/Fort_Wayne': 'America/Indiana/Indianapolis',
  'America/Montreal': 'America/Toronto',
  'America/Nipigon': 'America/Toronto',
  'America/Pangnirtung': 'America/Iqaluit',
  'America/Rainy_River': 'America/Winnipeg',
  'America/Santa_Isabel': 'America/Tijuana',
  'America/Shiprock': 'America/Denver',
  'America/Thunder_Bay': 'America/Toronto',
  'America/Yellowknife': 'America/Edmonton',
  'Pacific/Enderbury': 'Pacific/Kanton',
  'Pacific/Johnston': 'Pacific/Honolulu',
  'Pacific/Ponape': 'Pacific/Pohnpei',
  'Pacific/Samoa': 'Pacific/Pago_Pago',
  'Pacific/Truk': 'Pacific/Chuuk',
  'Pacific/Yap': 'Pacific/Chuuk',
  'Africa/Asmera': 'Africa/Asmara',
  'Africa/Timbuktu': 'Africa/Abidjan',

  // Antarctica
  'Antarctica/South_Pole': 'Antarctica/McMurdo',

  // Continental Europe legacy
  'Europe/Belfast': 'Europe/London',
  'Europe/Tiraspol': 'Europe/Chisinau',
  'Europe/Nicosia': 'Asia/Nicosia',

  // US legacy
  'US/Alaska': 'America/Anchorage',
  'US/Aleutian': 'America/Adak',
  'US/Arizona': 'America/Phoenix',
  'US/Central': 'America/Chicago',
  'US/East-Indiana': 'America/Indiana/Indianapolis',
  'US/Eastern': 'America/New_York',
  'US/Hawaii': 'Pacific/Honolulu',
  'US/Indiana-Starke': 'America/Indiana/Knox',
  'US/Michigan': 'America/Detroit',
  'US/Mountain': 'America/Denver',
  'US/Pacific': 'America/Los_Angeles',
  'US/Samoa': 'Pacific/Pago_Pago',

  // Canada legacy
  'Canada/Atlantic': 'America/Halifax',
  'Canada/Central': 'America/Winnipeg',
  'Canada/Eastern': 'America/Toronto',
  'Canada/Mountain': 'America/Edmonton',
  'Canada/Newfoundland': 'America/St_Johns',
  'Canada/Pacific': 'America/Vancouver',
  'Canada/Saskatchewan': 'America/Regina',
  'Canada/Yukon': 'America/Whitehorse',

  // Brazil / Chile / Mexico legacy
  'Brazil/Acre': 'America/Rio_Branco',
  'Brazil/DeNoronha': 'America/Noronha',
  'Brazil/East': 'America/Sao_Paulo',
  'Brazil/West': 'America/Manaus',
  'Chile/Continental': 'America/Santiago',
  'Chile/EasterIsland': 'Pacific/Easter',
  'Mexico/BajaNorte': 'America/Tijuana',
  'Mexico/BajaSur': 'America/Mazatlan',
  'Mexico/General': 'America/Mexico_City',

  // Australia legacy
  'Australia/ACT': 'Australia/Sydney',
  'Australia/Canberra': 'Australia/Sydney',
  'Australia/LHI': 'Australia/Lord_Howe',
  'Australia/NSW': 'Australia/Sydney',
  'Australia/North': 'Australia/Darwin',
  'Australia/Queensland': 'Australia/Brisbane',
  'Australia/South': 'Australia/Adelaide',
  'Australia/Tasmania': 'Australia/Hobart',
  'Australia/Victoria': 'Australia/Melbourne',
  'Australia/West': 'Australia/Perth',
  'Australia/Yancowinna': 'Australia/Broken_Hill',

  // Etc / GMT legacy (extremely common in older systems)
  'GMT': 'Etc/GMT',
  'GMT+0': 'Etc/GMT',
  'GMT-0': 'Etc/GMT',
  'GMT0': 'Etc/GMT',
  'Greenwich': 'Etc/GMT',
  'UCT': 'Etc/UTC',
  'UTC': 'Etc/UTC',
  'Universal': 'Etc/UTC',
  'Zulu': 'Etc/UTC',
  'Etc/Greenwich': 'Etc/GMT',
  'Etc/Universal': 'Etc/UTC',
  'Etc/Zulu': 'Etc/UTC',
  'Etc/UCT': 'Etc/UTC',
  'Etc/GMT+0': 'Etc/GMT',
  'Etc/GMT-0': 'Etc/GMT',
  'Etc/GMT0': 'Etc/GMT',

  // Misc
  'NZ': 'Pacific/Auckland',
  'NZ-CHAT': 'Pacific/Chatham',
  'Cuba': 'America/Havana',
  'Egypt': 'Africa/Cairo',
  'Eire': 'Europe/Dublin',
  'GB': 'Europe/London',
  'GB-Eire': 'Europe/London',
  'Hongkong': 'Asia/Hong_Kong',
  'Iceland': 'Africa/Abidjan',
  'Iran': 'Asia/Tehran',
  'Israel': 'Asia/Jerusalem',
  'Jamaica': 'America/Jamaica',
  'Japan': 'Asia/Tokyo',
  'Kwajalein': 'Pacific/Kwajalein',
  'Libya': 'Africa/Tripoli',
  'Navajo': 'America/Denver',
  'PRC': 'Asia/Shanghai',
  'Poland': 'Europe/Warsaw',
  'Portugal': 'Europe/Lisbon',
  'ROC': 'Asia/Taipei',
  'ROK': 'Asia/Seoul',
  'Singapore': 'Asia/Singapore',
  'Turkey': 'Europe/Istanbul',
  'W-SU': 'Europe/Moscow',
};

/**
 * Resolve a legacy/aliased IANA zone name to its canonical equivalent.
 *
 * If `tz` is not in the legacy alias table (i.e. already canonical, or
 * outside IANA), returns `tz` unchanged. This mirrors the semantics of the
 * IANA backward file: only legacy → canonical mappings are listed; canonical
 * names are absent and their identity is implicit.
 */
export function canonicalIanaName(tz: string): string {
  return ALIAS_TO_CANONICAL[tz] ?? tz;
}

/**
 * True iff two timezone strings refer to the same canonical IANA zone.
 *
 * Treats two nulls as equivalent (no client tz → no client tz → matched);
 * one null vs a real string as NOT equivalent (callers should null-check
 * before invoking the mismatch path).
 *
 * Spec: §12.3 alias-equivalence fix — replaces bare `!==` comparison in the
 * mismatch guard so the Checkpoint C unpark signal doesn't get polluted by
 * benign zone-rename traffic (e.g. Ukrainian users sending pre-2022b
 * `Europe/Kiev` while the Worker derives canonical `Europe/Kyiv`).
 */
export function tzEquivalent(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return canonicalIanaName(a) === canonicalIanaName(b);
}
