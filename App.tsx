import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { TrackingScreen } from './src/screens/TrackingScreen';
import { CategoryTransactionsScreen } from './src/screens/CategoryTransactionsScreen';
import { FinancialProvider } from './src/context/FinancialContext';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const Stack = createNativeStackNavigator();

// Setup basic notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Schedule a daily "Cue" notification as part of the Understand Pillar
    const scheduleDailyReminder = async () => {
      // Android push notifications (remote) were removed from Expo Go v53.
      // This can cause crashes if not handled carefully.
      if (Platform.OS === 'android' && !__DEV__) {
        // Only skip in production builds if you don't have a development build setup yet
        // However, for Expo Go, we'll use a try-catch to prevent the crash.
      }

      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;

        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Monara",
            body: "Have you logged your coffee today? Keep your 5-day streak alive!",
          },
          // @ts-ignore - Expo Notifications trigger union types can be overly strict
          trigger: {
            hour: 19,
            minute: 0,
            repeats: true,
          },
        });
      } catch (error) {
        console.warn('Notifications error:', error);
      }
    };

    scheduleDailyReminder();
  }, []);

  return (
    <SafeAreaProvider>
      <FinancialProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          {isAuthenticated ? (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Tabs" component={RootNavigator} />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="AddTransaction" component={TrackingScreen} options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen
                name="CategoryTransactions"
                component={CategoryTransactionsScreen}
                options={{ animation: 'slide_from_right' }}
              />
            </Stack.Navigator>
          ) : (
            <AuthScreen onAuthenticate={() => setIsAuthenticated(true)} />
          )}
        </NavigationContainer>
      </FinancialProvider>
    </SafeAreaProvider>
  );
}
