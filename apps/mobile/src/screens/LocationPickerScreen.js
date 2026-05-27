// 02c Location picker — search step 3.
// Real Nominatim (OpenStreetMap) geocoding via useLocationSearch.
// On selection: writes the chosen location to AsyncStorage via saveLocation()
// and the in-flight draft via patchDraft(). "Find moments" navigates to loading.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { ArrowLeft, X, Search, MapPin, Locate } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import PrimaryButton from '../components/PrimaryButton';
import Toast from '../components/Toast';
import { patchDraft, getDraft } from '../lib/draft-store';
import { saveLocation, getLastLocation, deviceTimezone } from '../lib/location-storage';
import { useLocationSearch } from '../hooks/useLocationSearch';
import {
  NominatimRateLimitError,
  NominatimError,
  reverseGeocode,
} from '../lib/nominatim';

function pickToSavedLocation(pick) {
  return {
    lat: pick.lat,
    lng: pick.lng,
    city: pick.city || pick.display_name.split(',')[0].trim(),
    country: pick.country ?? '',
    timezone: deviceTimezone(),
    selected_at: Math.floor(Date.now() / 1000),
  };
}

function errorMessage(err) {
  if (err instanceof NominatimRateLimitError) {
    return "Maps are busy right now. Wait a moment and try again.";
  }
  if (err instanceof NominatimError) {
    return "Couldn't reach the maps. Check your connection.";
  }
  return "Couldn't reach the maps. Check your connection.";
}

export default function LocationPickerScreen({ go }) {
  // Pre-fill the search query from the user's last saved city as a typing
  // shortcut. Selection is intentionally NOT restored — the "Find moments"
  // button stays disabled until the user explicitly taps a result row in
  // this session. Previously we hydrated `selectedPick` from the last
  // location too, which made the button look enabled on entry even when
  // the user had not chosen anything yet.
  const initialLast = getLastLocation();
  const [query, setQuery] = useState(initialLast?.city ?? '');
  const [selectedPick, setSelectedPick] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  // Transient confirmation pill — used for soft errors that don't need a
  // blocking dialog (network failure, no city resolvable, etc.). The
  // permission-denied path uses Alert instead because it needs the
  // "Open Settings" affordance.
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, tone = 'neutral') => {
    setToast({ message, tone, key: Date.now() });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const draft = getDraft();
  const activity = draft.activity ?? 'wedding';
  const actLabel = activity.replace('_', ' ');

  const { data: results, isLoading, error } = useLocationSearch(query);

  function handleSelect(result) {
    setSelectedPick(result);
    const loc = pickToSavedLocation(result);
    saveLocation(loc);
    // Mirror lat/lng/timezone/city onto the active draft so the loading screen
    // can build a complete ElectionalSearchRequest.
    patchDraft({ lat: loc.lat, lng: loc.lng, timezone: loc.timezone, city: loc.city });
  }

  // Real device-location flow. The previous implementation picked the first
  // forward-search hit, which produced wrong results when the user had
  // typed something else (typing "Paris" then tapping the button while in
  // Berlin would pick Paris). Now: GPS → reverse geocode via Nominatim →
  // populate query + select.
  //
  // Errors handled separately:
  //   - permission denied + canAskAgain=false → Alert with "Open Settings"
  //   - permission denied + canAskAgain=true   → silent (system already
  //     showed the dialog; nagging via toast is hostile)
  //   - GPS fix failed / network error         → Toast, keep user where
  //     they are so they can fall back to typing
  //   - reverse returned no city (ocean etc.)  → Toast, keep user typing
  async function handleUseCurrentLocation() {
    if (loadingLocation) return;
    setLoadingLocation(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        if (!perm.canAskAgain) {
          Alert.alert(
            'Location access needed',
            'To use your current location, allow access in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
        }
        // canAskAgain=true means the user just dismissed the system dialog;
        // they made an active choice this turn and don't need a second nudge.
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;

      const result = await reverseGeocode(latitude, longitude);
      if (!result) {
        showToast("Couldn't find a city for your location. Search manually.", 'warn');
        return;
      }

      const cityName =
        result.city || result.display_name.split(',')[0].trim();
      setQuery(cityName);
      // Use the GPS coordinates verbatim — Nominatim's lat/lng for the
      // resolved city would shift the event location to the city's
      // centroid (could be tens of km off). For electional astrology
      // the user's actual position is the truer input.
      handleSelect({ ...result, lat: latitude, lng: longitude });
    } catch (err) {
      if (__DEV__) console.log('[location] error:', err);
      showToast("Couldn't reach your location. Search manually.", 'warn');
    } finally {
      setLoadingLocation(false);
    }
  }

  function handleContinue() {
    // If the user typed but never tapped a row, default to the first result.
    const pick = selectedPick ?? results[0];
    if (!pick) return;
    const loc = pickToSavedLocation(pick);
    saveLocation(loc);
    patchDraft({ lat: loc.lat, lng: loc.lng, timezone: loc.timezone, city: loc.city });
    go('loading');
  }

  const showHelper = query.trim().length < 2 && results.length === 0 && !error;
  const showEmptyResults = query.trim().length >= 2 && !isLoading && !error && results.length === 0;

  return (
    // Wrap in a flex View so the Toast can be a sibling of the ScrollView —
    // a Toast inside the ScrollView would scroll with the content instead
    // of floating at a fixed screen position. Same pattern MomentDetail uses.
    <View className="flex-1">
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View className="overflow-hidden">
        <HeroGradient height={300} />
        <Starfield density="heavy" />
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('date')} label="Back">
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]" style={{ textTransform: 'capitalize' }}>
              {actLabel} · where
            </Text>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
          </View>
          <View className="px-6 pt-6 pb-9">
            <Text className="font-display text-[32px] leading-[38px] tracking-[-0.3px] text-cream">
              Where will it happen?
            </Text>
            <Text className="font-ui text-[14px] leading-5 text-muted mt-3">
              The location of the event — not where you are now.
            </Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Search input */}
      <View className="px-6 pt-10">
        <LinearGradient
          colors={['#1F1838', '#2A2247']}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#5B4F8A',
            shadowColor: '#8B6FE8',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.18,
            shadowRadius: 3,
          }}>
          <Search color="#B8B0CC" size={20} strokeWidth={1.5} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city"
            placeholderTextColor="#7A7195"
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            selectionColor="#A98DFF"
            className="font-ui text-base text-cream flex-1"
            style={{ fontFamily: 'Inter_400Regular', paddingVertical: 0 }}
          />
          {isLoading && <ActivityIndicator color="#A98DFF" size="small" />}
        </LinearGradient>
      </View>

      {/* Results / states */}
      <View className="px-6 pt-6 min-h-[120px]">
        {showHelper && (
          <Text className="font-ui italic text-[13px] leading-[18px] text-subtle text-center py-6 px-2">
            Type two or more letters to find a city.
          </Text>
        )}

        {error && (
          <Text className="font-ui text-[14px] leading-5 text-difficult text-center py-6 px-2">
            {errorMessage(error)}
          </Text>
        )}

        {showEmptyResults && (
          <Text className="font-ui text-[14px] text-muted text-center py-6">
            No cities found. Try a different spelling.
          </Text>
        )}

        {results.length > 0 &&
          results.map((r, i) => (
            <Result
              key={r.place_id}
              r={r}
              isLast={i === results.length - 1}
              selected={selectedPick?.place_id === r.place_id}
              onPress={() => handleSelect(r)}
            />
          ))}
      </View>

      {/* Use current location — real GPS + reverse geocode. Dimmed while
          the GPS fix + Nominatim lookup are in flight (typically 1-3s on
          a warm location service, longer on first request when iOS shows
          the permission dialog). Pressable swallows repeat taps via the
          loadingLocation guard in the handler. */}
      <View className="items-center pt-6">
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={loadingLocation}
          accessibilityState={{ disabled: loadingLocation }}
          className="flex-row items-center gap-[10px] h-12 px-5 rounded-md border border-glow active:border-primary-glow active:bg-primary/[0.08]"
          style={{ opacity: loadingLocation ? 0.6 : 1 }}>
          {loadingLocation ? (
            <ActivityIndicator color="#A98DFF" size="small" />
          ) : (
            <Locate color="#F5EFE4" size={16} strokeWidth={1.5} />
          )}
          <Text className="font-ui-med text-[15px] text-cream">
            {loadingLocation ? 'Finding your location…' : 'Use current location'}
          </Text>
        </Pressable>
      </View>

      <Text className="font-ui text-[12px] leading-[18px] text-subtle text-center mt-8 px-6">
        The sky's view depends on where you are.
      </Text>

      <View className="px-6 pt-8">
        {/* Disabled until the user has tapped a result row. PrimaryButton
            handles the dead-state visual (no glow, muted gradient, dimmed
            label) so we don't need to thread opacity at the call-site. */}
        <PrimaryButton onPress={handleContinue} disabled={!selectedPick}>
          Find moments
        </PrimaryButton>
      </View>
    </ScrollView>
    <Toast
      key={toast?.key}
      message={toast?.message}
      tone={toast?.tone}
      onDismiss={dismissToast}
    />
    </View>
  );
}

function Result({ r, isLast, selected, onPress }) {
  // Two-line row: city (primary) + country (secondary). Falls back to the
  // display_name's tail if Nominatim didn't structure the address.
  const primary = r.city || r.display_name.split(',')[0].trim();
  const secondary = r.country || r.display_name.split(',').slice(1).join(',').trim();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-[14px] pl-3 pr-[14px]"
      style={{
        borderBottomColor: isLast ? 'transparent' : '#2A2247',
        borderBottomWidth: isLast ? 0 : 1,
        borderLeftColor: selected ? '#8B6FE8' : 'transparent',
        borderLeftWidth: 2,
      }}>
      <MapPin color={selected ? '#A98DFF' : '#7A7195'} size={18} strokeWidth={1.5} />
      <View className="flex-1">
        <Text className="font-ui text-base leading-[22px] text-cream">{primary}</Text>
        {secondary ? (
          <Text className="font-ui text-[13px] leading-[18px] text-muted mt-[2px]" numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
