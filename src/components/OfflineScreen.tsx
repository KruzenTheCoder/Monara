import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { theme } from '../utils/theme';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  return isConnected;
};

export const OfflineScreen: React.FC = () => {
  const [checking, setChecking] = useState(false);

  const retry = async () => {
    setChecking(true);
    await NetInfo.fetch();
    setTimeout(() => setChecking(false), 1500);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundStart }]}>
      <View style={styles.iconWrap}>
        <WifiOff color={theme.colors.secondaryText} size={56} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>Oops!</Text>
      <Text style={styles.subtitle}>Please check your connectivity</Text>
      <Text style={styles.desc}>
        It looks like you're not connected to the internet. Check your Wi-Fi or mobile data and try again.
      </Text>
      <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.8} disabled={checking}>
        <RefreshCw color="#FFF" size={18} style={checking ? { opacity: 0.5 } : undefined} />
        <Text style={styles.retryText}>{checking ? 'Checking...' : 'Try Again'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(27,42,74,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.primaryText,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.secondaryText,
    marginBottom: 16,
  },
  desc: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    maxWidth: 300,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  retryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
