import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Easing, Dimensions } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme } from '../utils/theme';
import { ShieldCheck, Fingerprint } from 'lucide-react-native';

const { height } = Dimensions.get('window');

export const AuthScreen = ({ onAuthenticate }: { onAuthenticate: () => void }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // 1. Initial logo pulse & fade in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    // 2. Preloader finishes after 1.5s
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // 3. Staggered reveal of login content
      Animated.stagger(150, [
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleBiometricAuth = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      if (!compatible || !enrolled) {
        onAuthenticate();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Monara',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        onAuthenticate();
      } else {
        Alert.alert('Authentication Failed', 'Please try again.');
      }
    } catch (error) {
      console.error(error);
      onAuthenticate();
    }
  };

  return (
    <AnimatedBackground>
      <View style={styles.container}>
        <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <ShieldCheck color={theme.colors.accent} size={64} strokeWidth={1.5} />
          <Text style={styles.logoText}>MONARA</Text>
        </Animated.View>

        {!isLoading && (
          <Animated.View style={[
            styles.contentContainer,
            { 
              opacity: contentOpacity, 
              transform: [{ translateY: contentTranslateY }] 
            }
          ]}>
            <GlassBox style={styles.card}>
              <Text style={theme.typography.h1}>Welcome Back</Text>
              <Text style={[theme.typography.body, styles.subtitle]}>
                Securely access your wealth ecosystem.
              </Text>
              
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleBiometricAuth}
                activeOpacity={0.8}
              >
                <Fingerprint color="#fff" size={24} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Unlock with Biometrics</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={onAuthenticate} // Fallback for dev
                activeOpacity={0.6}
              >
                <Text style={styles.secondaryButtonText}>Use PIN instead</Text>
              </TouchableOpacity>
            </GlassBox>
          </Animated.View>
        )}
      </View>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    position: 'absolute',
    top: height * 0.25,
  },
  logoText: {
    ...theme.typography.mono,
    fontSize: 28,
    marginTop: 16,
    letterSpacing: 4,
  },
  contentContainer: {
    width: '100%',
    marginTop: height * 0.15,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 30, 30, 0.4)', // more translucent
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 40,
    textAlign: 'center',
    color: theme.colors.secondaryText,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    justifyContent: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    ...theme.typography.h2,
    color: '#000', // high contrast against accent
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    marginTop: 24,
  },
  secondaryButtonText: {
    ...theme.typography.body,
    color: theme.colors.secondaryText,
    fontSize: 14,
  }
});
