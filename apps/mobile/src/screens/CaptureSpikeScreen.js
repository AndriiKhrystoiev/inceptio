// ============================================================================
// PHASE 0 — CAPTURE SPIKE (go/no-go gate). THROWAWAY SCAFFOLDING.
// ----------------------------------------------------------------------------
// Purpose: prove `react-native-view-shot@^5.1.0` reliably captures an on-screen
// view to a clean, valid PNG on a REAL bridgeless New-Architecture iOS dev
// client (RN 0.83 New Arch is bridgeless). This is the riskiest unknown for the
// native Moment Card path — open issues #653/#657 show captureRef failing to
// resolve the native module under bridgeless. See the spec, §3/§4.
//
// PASS bar: BOTH targets capture, and the captured PNG (shown back on-screen)
// VISIBLY CONTAINS the radial-gradient halo. Marginal / flaky / blank = FAIL →
// fall back to the server-side Satori render path.
//
// Reached via the `SPIKE_CAPTURE` boot flag in App.js. Delete this file + the
// flag once the go/no-go result is recorded.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors, fonts } from '../theme';

// Runtime diagnostic — confirms we are actually on bridgeless + New Arch
// (TurboModules), the exact configuration #657 breaks under. The tester should
// record this line with the result.
const RUNTIME = (() => {
  const bridgeless = typeof global !== 'undefined' && !!global.RN$Bridgeless;
  const turbo = typeof global !== 'undefined' && !!global.__turboModuleProxy;
  const rnv = Platform.constants?.reactNativeVersion;
  const rn = rnv ? `${rnv.major}.${rnv.minor}.${rnv.patch}` : 'unknown';
  return `${Platform.OS} · RN ${rn} · bridgeless=${bridgeless} · turbo=${turbo}`;
})();

export default function CaptureSpikeScreen() {
  const plainRef = useRef(null);
  const haloRef = useRef(null);
  const [results, setResults] = useState({}); // key -> { uri, w, h } | { error }
  const [busy, setBusy] = useState(false);

  // The spike bypasses the normal screen tree, so hide the splash ourselves.
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);

  // Headless self-report: auto-capture both targets on mount and log
  // structured results to Metro (SPIKE_RESULT::), so the smoke can be read
  // from the bundler log without tapping. The captured tmpfile path is host-
  // readable on a simulator, so halo-survives-capture is verified off-device.
  // Manual buttons below still work for human inspection.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line no-console
      console.log('SPIKE_RUNTIME::' + RUNTIME);
      // Let layout settle + the SVG halo paint before capturing.
      await new Promise((r) => setTimeout(r, 1500));
      for (const [ref, key] of [[plainRef, 'A'], [haloRef, 'B']]) {
        if (cancelled) return;
        try {
          const uri = await captureRef(ref, { format: 'png', result: 'tmpfile' });
          // eslint-disable-next-line no-console
          console.log('SPIKE_RESULT::' + JSON.stringify({ key, ok: true, uri }));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log('SPIKE_RESULT::' + JSON.stringify({ key, ok: false, error: e?.message ?? String(e) }));
        }
      }
      // eslint-disable-next-line no-console
      console.log('SPIKE_DONE::');
    })();
    return () => { cancelled = true; };
  }, []);

  const setResult = (key, value) =>
    setResults((prev) => ({ ...prev, [key]: value }));

  async function capture(ref, key) {
    setBusy(true);
    setResult(key, undefined);
    try {
      // result:'tmpfile' → file:// URI that expo-sharing can consume directly.
      // No `pixelRatio` option in 5.x; output is real device px at view size.
      const uri = await captureRef(ref, { format: 'png', result: 'tmpfile' });
      Image.getSize(
        uri,
        (w, h) => setResult(key, { uri, w, h }),
        () => setResult(key, { uri, w: 0, h: 0 }),
      );
    } catch (e) {
      // The bridgeless failure mode surfaces here as
      // "NativeModules.RNViewShot is undefined" / TurboModule null.
      setResult(key, { error: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function share(key) {
    const r = results[key];
    if (!r?.uri) return;
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setResult(key, { ...r, error: 'Sharing.isAvailableAsync() === false' });
        return;
      }
      await Sharing.shareAsync(r.uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Capture spike',
      });
    } catch (e) {
      setResult(key, { ...r, error: `share: ${e?.message ?? String(e)}` });
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Phase 0 · Capture Spike</Text>
        <Text style={styles.runtime}>{RUNTIME}</Text>
        <Text style={styles.note}>
          PASS = both targets capture AND the captured PNG below visibly shows the
          violet halo. Marginal/blank/flaky = FAIL → server fallback.
        </Text>

        {/* ---- Target A: plain opaque baseline ---- */}
        <Text style={styles.h2}>A · Plain opaque view</Text>
        <View ref={plainRef} collapsable={false} style={styles.targetPlain}>
          <Text style={styles.plainText}>Inceptio</Text>
          <Text style={styles.plainSub}>baseline capture</Text>
        </View>
        <Row>
          <Btn label="Capture A" onPress={() => capture(plainRef, 'a')} busy={busy} />
          <Btn label="Share A" onPress={() => share('a')} busy={busy} ghost />
        </Row>
        <ResultView result={results.a} />

        {/* ---- Target B: capture-safe radial-gradient halo (the real risk) ---- */}
        <Text style={styles.h2}>B · Radial-gradient halo + moon</Text>
        <View ref={haloRef} collapsable={false} style={styles.targetHalo}>
          {/* Halo rendered as an SVG RadialGradient (capture-safe), NOT a native
              shadow — mirrors the planned CaptureSafeMoon mechanism (spec §7b). */}
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <RadialGradient id="halo" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <Stop offset="0" stopColor="#A98DFF" stopOpacity="0.75" />
                <Stop offset="0.55" stopColor="#A98DFF" stopOpacity="0.28" />
                <Stop offset="1" stopColor="#A98DFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#halo)" />
          </Svg>
          <View style={styles.moon} />
        </View>
        <Row>
          <Btn label="Capture B" onPress={() => capture(haloRef, 'b')} busy={busy} />
          <Btn label="Share B" onPress={() => share('b')} busy={busy} ghost />
        </Row>
        <ResultView result={results.b} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ children }) {
  return <View style={styles.row}>{children}</View>;
}

function Btn({ label, onPress, busy, ghost }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.btn, ghost && styles.btnGhost, busy && styles.btnBusy]}
    >
      <Text style={[styles.btnText, ghost && styles.btnTextGhost]}>{label}</Text>
    </Pressable>
  );
}

function ResultView({ result }) {
  if (!result) return null;
  if (result.error) {
    return (
      <View style={styles.resultBox}>
        <Text style={styles.fail}>FAIL — {result.error}</Text>
      </View>
    );
  }
  return (
    <View style={styles.resultBox}>
      <Text style={styles.ok}>
        captured · {result.w}×{result.h}px
      </Text>
      {/* Showing the captured PNG back on-screen IS the verification: if the
          halo is visible here, it survived capture. */}
      <Image source={{ uri: result.uri }} style={styles.preview} resizeMode="contain" />
      <Text style={styles.uri} numberOfLines={2}>{result.uri}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgBase },
  scroll: { padding: 20, paddingBottom: 60, gap: 12 },
  h1: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  runtime: { fontFamily: fonts.mono ?? 'Courier', fontSize: 12, color: colors.gold },
  note: { fontFamily: fonts.body ?? 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  h2: { fontFamily: fonts.display, fontSize: 17, color: colors.text, marginTop: 16 },

  targetPlain: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  plainText: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  plainSub: { fontFamily: fonts.body ?? 'Inter_400Regular', fontSize: 13, color: colors.textMuted },

  targetHalo: {
    height: 200, borderRadius: 16, overflow: 'hidden',
    backgroundColor: colors.bgBase, // opaque base — no transparent edges
    alignItems: 'center', justifyContent: 'center',
  },
  moon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FBF6E9',
  },

  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 11,
    paddingHorizontal: 18, flex: 1, alignItems: 'center',
  },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderGlow },
  btnBusy: { opacity: 0.5 },
  btnText: { fontFamily: fonts.body ?? 'Inter_500Medium', fontSize: 15, color: colors.text },
  btnTextGhost: { color: colors.textMuted },

  resultBox: { marginTop: 10, gap: 6 },
  ok: { fontFamily: fonts.body ?? 'Inter_500Medium', fontSize: 13, color: colors.mint },
  fail: { fontFamily: fonts.body ?? 'Inter_500Medium', fontSize: 13, color: colors.difficult },
  preview: {
    width: '100%', height: 220, borderRadius: 12, backgroundColor: '#000',
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  uri: { fontFamily: fonts.mono ?? 'Courier', fontSize: 10, color: colors.textSubtle },
});
