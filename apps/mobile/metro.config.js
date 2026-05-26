const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Mobile is NOT in the root npm workspaces — it has its own node_modules —
// but it consumes `@inceptio/shared-types` via a file: link to the monorepo.
// Metro needs the monorepo root in `watchFolders` so it can read & transpile
// the linked package's TypeScript sources, and `nodeModulesPaths` so peer
// resolution falls back to the monorepo's root node_modules if needed.
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// Honor the symlink that npm created for `@inceptio/shared-types`.
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: './global.css' });
