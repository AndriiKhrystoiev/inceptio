// Pulse — meditative loading indicator: gold core that breathes,
// surrounded by two staggered violet rings.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

export default function Pulse() {
  // Two ring "expand+fade" cycles, staggered by 1s.
  const ring0 = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  // Core "breath".
  const core  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (anim, delay) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2000, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      ])
    );
    const a = make(ring0, 0);
    const b = make(ring1, 1000);
    const c = Animated.loop(
      Animated.sequence([
        Animated.timing(core, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(core, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, []);

  // Animated style arrays must stay as JS objects — className cannot interpolate.
  const ringStyle = (anim) => ({
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 999,
    borderColor: 'rgba(169,141,255,0.55)',
    borderWidth: 1,
    transform: [{
      scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.5] }),
    }],
    opacity: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.55, 0.10, 0] }),
  });

  return (
    // Non-animated wrapper migrated to className.
    <View className="w-[120px] h-[120px] items-center justify-center">
      <Animated.View style={ringStyle(ring0)}/>
      <Animated.View style={ringStyle(ring1)}/>
      {/* Core: centered glow (shadowOffset 0,0) + animated scale/opacity — must stay inline. */}
      <Animated.View style={{
        width: 18,
        height: 18,
        borderRadius: 999,
        backgroundColor: '#F0D89A',
        shadowColor: '#F0D89A',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 4,
        transform: [{
          scale: core.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
        }],
        opacity: core.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
      }}/>
    </View>
  );
}
