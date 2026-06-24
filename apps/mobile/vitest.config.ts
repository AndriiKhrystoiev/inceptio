import { defineConfig } from 'vitest/config';

// Mobile-side tests run only the node-friendly lib files. Anything that
// touches React Native, NativeWind, or native modules is left to the device.
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/config/__tests__/**/*.test.ts',
      'src/lib/**/__tests__/**/*.test.ts',
      'src/components/__tests__/**/*.test.{ts,js}',
      'src/hooks/__tests__/**/*.test.ts',
      'src/i18n/__tests__/**/*.test.ts',
      'src/screens/__tests__/**/*.test.{ts,js}',
      'src/share/__tests__/**/*.test.ts',
    ],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/{lib,config,hooks,i18n,share}/**/*.{ts,tsx}'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.*',
        'src/hooks/useLocationSearch.ts',
        'src/hooks/useElectionalSearch.ts',
        'src/hooks/useDailyNote.ts',
        'src/hooks/useMomentCardShare.js',
        'src/lib/update-gate/update-gate-context.ts',
        'src/lib/update-gate/use-update-gate.ts',
        'src/share/native-share-provider.ts',
        'src/share/share-provider.ts',
        'src/i18n/index.ts',
        'src/i18n/polyfills.ts',
      ],
      // thresholds added in Task 14 after first measured run
    },
  },
});
