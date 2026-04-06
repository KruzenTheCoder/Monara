const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure SVG is treated as a static asset (for expo-image rendering)
if (!config.resolver.assetExts.includes('svg')) {
  config.resolver.assetExts.push('svg');
}

module.exports = config;
