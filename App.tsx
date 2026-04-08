import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { TrackingScreen } from './src/screens/TrackingScreen';
import { CategoryTransactionsScreen } from './src/screens/CategoryTransactionsScreen';
import { AIAssistantScreen } from './src/screens/AIAssistantScreen';
import { FinancialHealthScreen } from './src/screens/FinancialHealthScreen';
import { ChallengesScreen } from './src/screens/ChallengesScreen';
import { WhatIfScreen } from './src/screens/WhatIfScreen';
import { ReceiptScannerScreen } from './src/screens/ReceiptScannerScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { DebtPayoffScreen } from './src/screens/DebtPayoffScreen';
import { InvestmentTrackerScreen } from './src/screens/InvestmentTrackerScreen';
import { BillsScreen } from './src/screens/BillsScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { FinancialProvider } from './src/context/FinancialContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { GamificationProvider } from './src/context/GamificationContext';
import { StyledAlertProvider } from './src/components/StyledAlert';
import { RewardPopup } from './src/components/RewardPopup';
import { OfflineScreen, useNetworkStatus } from './src/components/OfflineScreen';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Platform, View, ActivityIndicator } from 'react-native';
import { theme } from './src/utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAdapter } from './src/db';
import { supabase } from './src/lib/supabase';

const Stack = createNativeStackNavigator();

// Setup basic notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const suppress = !!(globalThis as any).__monaraSuppressNotifications;
    if (suppress) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

const NavigationWrapper = () => {
  const { session, isLoading } = useAuth();
  const isConnected = useNetworkStatus();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const onboardingKey = useMemo(
    () => `@monara:onboarding:${session?.user?.id || 'local'}`,
    [session?.user?.id],
  );

  useEffect(() => {
    const scheduleDailyReminder = async () => {
      if (Platform.OS === 'android' && !__DEV__) {
        // Only skip in production builds if you don't have a development build setup yet
      }

      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('daily-reminder', {
            name: 'Daily reminders',
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3E92CC',
          });
        }

        const existingId = await AsyncStorage.getItem('@monara:daily_reminder_id');
        if (existingId) {
          await Notifications.cancelScheduledNotificationAsync(existingId);
        }

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Monara",
            body: "Have you logged your coffee today? Keep your 5-day streak alive!",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 19,
            minute: 0,
            ...(Platform.OS === 'android' ? { channelId: 'daily-reminder' } : {}),
          },
        });
        await AsyncStorage.setItem('@monara:daily_reminder_id', id);
      } catch (error) {
        console.warn('Notifications error:', error);
      }
    };

    scheduleDailyReminder();
  }, []);

  useEffect(() => {
    const check = async () => {
      if (!session) {
        setNeedsOnboarding(false);
        setOnboardingChecked(true);
        return;
      }
      setOnboardingChecked(false);
      try {
        // Prefer a Supabase DB check when configured (matches "check on the Supabase DB" requirement)
        const hasSupabase =
          !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

        if (hasSupabase) {
          const { data, error } = await supabase
            .from('onboarding_responses')
            .select('completed, completed_at, answers')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (error) throw error;

          const completed = !!data?.completed;
          setNeedsOnboarding(!completed);
          if (completed) {
            await AsyncStorage.setItem(
              onboardingKey,
              JSON.stringify({
                completed: true,
                completed_at: data?.completed_at || null,
                answers: data?.answers || {},
              }),
            );
          } else {
            await AsyncStorage.removeItem(onboardingKey);
          }
          return;
        }

        // Fallback to whichever backend is configured (or local storage)
        const db = getAdapter();
        if (db.getOnboarding) {
          const res = await db.getOnboarding();
          const completed = !!(res && res.completed);
          setNeedsOnboarding(!completed);
          if (completed) {
            await AsyncStorage.setItem(
              onboardingKey,
              JSON.stringify({ completed: true, completed_at: res?.completed_at || null, answers: res?.answers || {} }),
            );
          } else {
            await AsyncStorage.removeItem(onboardingKey);
          }
        } else {
          const raw = await AsyncStorage.getItem(onboardingKey);
          const parsed = raw ? JSON.parse(raw) : null;
          setNeedsOnboarding(!(parsed && parsed.completed));
        }
      } catch {
        setNeedsOnboarding(true);
      } finally {
        setOnboardingChecked(true);
      }
    };
    check();
  }, [session, onboardingKey]);

  if (isLoading || (session && !onboardingChecked)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.backgroundStart }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const navTheme = theme.isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: theme.colors.backgroundStart,
          card: theme.colors.surface,
          text: theme.colors.primaryText,
          border: theme.colors.divider,
          primary: theme.colors.accent,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: theme.colors.backgroundStart,
          card: theme.colors.surface,
          text: theme.colors.primaryText,
          border: theme.colors.divider,
          primary: theme.colors.accent,
        },
      };

  if (isConnected === false) {
    return <OfflineScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} translucent={true} />
      <RewardPopup />
      {session ? (
        <Stack.Navigator
          key={needsOnboarding ? 'onboarding' : 'main'}
          initialRouteName={needsOnboarding ? 'Onboarding' : 'Tabs'}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Onboarding">
            {() => (
              <OnboardingScreen
                onFinished={() => setNeedsOnboarding(false)}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Tabs" component={RootNavigator} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="AddTransaction" component={TrackingScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="CategoryTransactions"
            component={CategoryTransactionsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen name="Bills" component={BillsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="AIAssistant"
            component={AIAssistantScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="FinancialHealth"
            component={FinancialHealthScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Challenges"
            component={ChallengesScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="WhatIf"
            component={WhatIfScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ReceiptScanner"
            component={ReceiptScannerScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="SmartNotifications"
            component={NotificationsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="DebtPayoff"
            component={DebtPayoffScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="InvestmentTracker"
            component={InvestmentTrackerScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GamificationProvider>
          <FinancialProvider>
            <StyledAlertProvider />
            <NavigationWrapper />
          </FinancialProvider>
        </GamificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
