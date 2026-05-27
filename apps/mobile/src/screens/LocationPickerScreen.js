// 02c Location picker — search step 3.
// Real Nominatim (OpenStreetMap) geocoding via useLocationSearch.
// On selection: writes the chosen location to AsyncStorage via saveLocation()
// and the in-flight draft via patchDraft(). "Find moments" navigates to loading.

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X, Search, MapPin, Locate } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import PrimaryButton from '../components/PrimaryButton';
import { patchDraft, getDraft } from '../lib/draft-store';
import { saveLocation, getLastLocation, deviceTimezone } from '../lib/location-storage';
import { useLocationSearch } from '../hooks/useLocationSearch';
import { NominatimRateLimitError, NominatimError } from '../lib/nominatim';

function lastLocationToPick(loc) {
  if (!loc) return null;
  return {
    place_id: -1,
    lat: loc.lat,
    lng: loc.lng,
    city: loc.city,
    country: loc.country,
    display_name: loc.country ? `${loc.city}, ${loc.country}` : loc.city,
  };
}

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
  // Pre-populate from the user's last saved pick if any — UX bonus.
  const initialLast = getLastLocation();
  const [query, setQuery] = useState(initialLast?.city ?? '');
  // Track the chosen NominatimResult (or restored last-pick) rather than an
  // index, so selection survives query/result churn.
  const [selectedPick, setSelectedPick] = useState(lastLocationToPick(initialLast));

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

  // TODO Phase 5: replace with `expo-location` → reverse geocode to a city
  // string. For now, pick the first available search result.
  function handleUseCurrentLocation() {
    const first = results[0];
    if (!first) return;
    setQuery(first.city || first.display_name.split(',')[0].trim());
    handleSelect(first);
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

      {/* Use current location — stub; Phase 5 wires expo-location */}
      <View className="items-center pt-6">
        <Pressable
          onPress={handleUseCurrentLocation}
          className="flex-row items-center gap-[10px] h-12 px-5 rounded-md border border-glow active:border-primary-glow active:bg-primary/[0.08]">
          <Locate color="#F5EFE4" size={16} strokeWidth={1.5} />
          <Text className="font-ui-med text-[15px] text-cream">Use current location</Text>
        </Pressable>
      </View>

      <Text className="font-ui text-[12px] leading-[18px] text-subtle text-center mt-8 px-6">
        The sky's view depends on where you are.
      </Text>

      <View className="px-6 pt-8">
        {/* Disabled when no location is selected. onPress=undefined swallows
            taps via Pressable; the 0.4 opacity is the visual cue. Forwarded
            through PrimaryButton's `style` prop, which it merges into its
            Pressable style array. */}
        <PrimaryButton
          onPress={selectedPick ? handleContinue : undefined}
          style={selectedPick ? undefined : { opacity: 0.4 }}>
          Find moments
        </PrimaryButton>
      </View>
    </ScrollView>
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
