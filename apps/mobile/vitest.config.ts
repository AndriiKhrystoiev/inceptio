import { defineConfig } from 'vitest/config';

// Mobile-side tests run only the node-friendly lib files. Anything that
// touches React Native, NativeWind, or native modules is left to the device.
export default defineConfig({
  test: {
    include: [
      'src/config/__tests__/**/*.test.ts',
      'src/lib/__tests__/**/*.test.ts',
      'src/hooks/__tests__/**/*.test.ts',
      'src/screens/__tests__/**/*.test.{ts,js}',
    ],
    environment: 'node',
  },
});
