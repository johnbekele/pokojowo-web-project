import { ExpoConfig, ConfigContext } from 'expo/config';

// CloudFront in front of the AWS backend. One host serves everything: /api and
// /socket.io reach the monolith, /api/chat, /api/messages and /chat-socket.io
// reach the chat service, and /uploads comes straight from S3.
const PRODUCTION_BACKEND_URL = 'https://dh3iw703m1vvi.cloudfront.net';

export default ({ config }: ConfigContext): ExpoConfig => {
  const appVersion = '1.0.0';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || `${PRODUCTION_BACKEND_URL}/api`;
  const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || PRODUCTION_BACKEND_URL;
  const chatApiUrl = process.env.EXPO_PUBLIC_CHAT_API_URL || apiUrl;
  const chatSocketUrl = process.env.EXPO_PUBLIC_CHAT_SOCKET_URL || socketUrl;
  const imageBaseUrl = process.env.EXPO_PUBLIC_IMAGE_BASE_URL || socketUrl;
  const projectId = process.env.EAS_PROJECT_ID?.trim();
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || '';
  const sentryEnvironment =
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  const sentryRelease =
    process.env.EXPO_PUBLIC_SENTRY_RELEASE?.trim() ||
    process.env.SENTRY_RELEASE?.trim() ||
    `pokojowo-mobile@${appVersion}`;
  const sentryBuildPlugin: NonNullable<ExpoConfig['plugins']> = process.env.SENTRY_AUTH_TOKEN
    ? [
        [
          '@sentry/react-native/expo',
          {
            // Organization/project are read from EAS environment variables;
            // the auth token is never placed in the public Expo config.
            organization: process.env.SENTRY_ORG || undefined,
            project: process.env.SENTRY_PROJECT || undefined,
            url: process.env.SENTRY_URL || undefined,
          },
        ],
      ]
    : [];

  return {
    ...config,
    name: 'Pokojowo',
    slug: 'pokojowo',
    scheme: 'pokojowo',
    version: appVersion,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#14b8a6',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.pokojowo.app',
      usesAppleSignIn: true,
      infoPlist: {
        NSCameraUsageDescription: 'Used to take profile photos and listing images',
        NSPhotoLibraryUsageDescription: 'Used to select profile photos and listing images',
        NSFaceIDUsageDescription: 'Used for secure biometric login',
        NSLocationWhenInUseUsageDescription: 'Used to show nearby listings',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#14b8a6',
      },
      package: 'com.pokojowo.app',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      // Without this key react-native-maps renders a blank grey grid on Android.
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        },
      },
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Pokojowo to access your photos for profile and listings',
          cameraPermission: 'Allow Pokojowo to take photos for profile and listings',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#14b8a6',
        },
      ],
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'Allow Pokojowo to use Face ID for secure login',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Allow Pokojowo to center the map on rooms near you',
        },
      ],
      'expo-localization',
      'expo-web-browser',
      'expo-apple-authentication',
      ...sentryBuildPlugin,
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      apiUrl,
      chatApiUrl,
      socketUrl,
      chatSocketUrl,
      imageBaseUrl,
      publicSiteUrl: process.env.EXPO_PUBLIC_SITE_URL || 'https://pokojowo.com',
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
      sentryDsn,
      sentryEnvironment,
      sentryRelease,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
