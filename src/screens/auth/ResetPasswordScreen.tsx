import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, Image, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBox } from '../../components/GlassBox';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { theme } from '../../utils/theme';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { showStyledAlert } from '../../components/StyledAlert';
import * as Haptics from 'expo-haptics';

const { height } = Dimensions.get('window');

export const ResetPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const { resetPassword } = useAuth();
  const navigation = useNavigation<any>();

  // Animated entrance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleReset = async () => {
    if (!email) {
      showStyledAlert('Missing Email', 'Please enter your email address to receive a reset link.', undefined, 'destructive');
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);

    if (error) {
      showStyledAlert('Reset Failed', error.message, undefined, 'destructive');
    } else {
      showStyledAlert(
        'Check Your Email',
        'We have sent a password reset link to your email address.',
        undefined,
        'success'
      );
      navigation.navigate('Login');
    }
  };

  return (
    <AnimatedBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backButton}>
          <ArrowLeft color={theme.colors.primaryText} size={22} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY }] }]}>
          <GlassBox style={styles.card}>
            <Image
              source={require('../../../assets/monara-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Password Recovery</Text>

            <Text style={theme.typography.h1}>Reset Password</Text>
            <Text style={[theme.typography.body, styles.subtitle]}>
              Enter your email to receive a secure reset link.
            </Text>

            <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
              <Mail color={emailFocused ? theme.colors.accent : theme.colors.secondaryText} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={theme.colors.secondaryText}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              onPress={handleReset}
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              activeOpacity={0.9}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#3E92CC', '#2B7AB5', '#1B6A9E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, isLoading && styles.buttonDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </GlassBox>
        </Animated.View>
      </KeyboardAvoidingView>
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
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 24,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
  },
  logoImage: {
    width: 180,
    height: 56,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.secondaryText,
    marginBottom: 28,
    letterSpacing: 0.3,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: theme.colors.glassBorder,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 30,
    textAlign: 'center',
    color: theme.colors.secondaryText,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.divider,
  },
  inputContainerFocused: {
    borderColor: `${theme.colors.accent}80`,
    backgroundColor: theme.isDark ? theme.colors.surface : '#FAFAFC',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: theme.colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#1B6A9E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
