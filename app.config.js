/**
 * Expo app configuration.
 * Using app.config.js instead of app.json so EXPO_PUBLIC_* env vars are loaded.
 */
export default {
  expo: {
    name: 'monara-app',
    slug: 'monara-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: 'monara', // needed for OAuth deep-link redirects
    splash: {
      image: './assets/monara-splash.png',
      resizeMode: 'cover',
      backgroundColor: '#FAFAFC',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.monara.app',
      usesAppleSignIn: true, // enables Apple Sign-In capability
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/morana-icon.png',
        backgroundColor: '#FAFAFC',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.anonymous.monaraapp',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-apple-authentication',
    ],
    extra: {
      eas: {
        projectId: "78b561f4-c30c-4499-928d-0dbc6a14754f"
      }
    }
  },
};
