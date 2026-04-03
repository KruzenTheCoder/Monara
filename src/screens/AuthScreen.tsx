import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme } from '../utils/theme';

export const AuthScreen = ({ onAuthenticate }: { onAuthenticate: () => void }) => {
  const handleBiometricAuth = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      if (!compatible || !enrolled) {
        // Fallback for demo purposes
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
      // Fallback
      onAuthenticate();
    }
  };

  return (
    <AnimatedBackground>
      <View style={styles.container}>
        <GlassBox style={styles.card}>
          <Text style={theme.typography.h1}>Monara</Text>
          <Text style={[theme.typography.body, styles.subtitle]}>
            Your world-class financial ecosystem.
          </Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleBiometricAuth}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Unlock with Biometrics</Text>
          </TouchableOpacity>
        </GlassBox>
      </View>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    ...theme.typography.h2,
    fontSize: 18,
  }
});
