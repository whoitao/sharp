const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch both mobile app and workspace root for proper module resolution
config.watchFolders = [...(config.watchFolders || []), workspaceRoot];

// Configure resolver for monorepo with proper module resolution
config.resolver = {
  ...config.resolver,
  // Enable symlinks for monorepo hoisted packages
  unstable_enableSymlinks: true,
  // Add workspace root node_modules so shared packages are found correctly
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  blockList: [
    /\/node_modules\/react-native\/local-cli\/.*/,
    /\/\.next\/.*/,
    /\/\.git\/.*/,
  ],
};

module.exports = config;
