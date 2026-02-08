import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Pokojowo',
  slug: 'pokojowo',
  scheme: 'pokojowo',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#14b8a6',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.pokojowo.app',
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
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://pokojowo-web-project.onrender.com/api',
    socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'https://pokojowo-web-project.onrender.com',
    eas: {
      projectId: process.env.EAS_PROJECT_ID || 'your-project-id',
    },
  },
});
