import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions, Image, Animated, Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GlassBox } from '../../components/GlassBox';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { theme, gradients } from '../../utils/theme';
import { Mail, Lock, ArrowRight, Globe, Apple } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { showStyledAlert } from '../../components/StyledAlert';

const { width: SCREEN_W } = Dimensions.get('window');

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const { signInWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Staggered entrance
  const anims = useRef(
    Array.from({ length: 7 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(30),
    })),
  ).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // Stagger card elements
    anims.forEach((a, i) => {
      Animated.parallel([
        Animated.timing(a.opacity, { toValue: 1, duration: 500, delay: 300 + i * 70, useNativeDriver: true }),
        Animated.spring(a.translateY, { toValue: 0, tension: 80, friction: 12, delay: 300 + i * 70, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      showStyledAlert('Missing Information', 'Please provide both email and password.', undefined, 'destructive');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    const { error } = await signInWithEmail(email, password);
    setIsLoading(false);
    if (error) {
      showStyledAlert('Login Failed', error.message, undefined, 'destructive');
    }
  };

  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    setIsLoading(false);
    if (error) showStyledAlert('Google Login Failed', error.message, undefined, 'destructive');
  };

  const handleAppleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    const { error } = await signInWithApple();
    setIsLoading(false);
    if (error) showStyledAlert('Apple Login Failed', error.message, undefined, 'destructive');
  };

  const onBtnPressIn = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const onBtnPressOut = () => Animated.spring(btnScale, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }).start();

  const anim = (i: number) => ({ opacity: anims[i].opacity, transform: [{ translateY: anims[i].translateY }] });

  return (
    <AnimatedBackground>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 16 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Image
            source={require('../../../assets/monara-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>understand your money, daily.</Text>
        </Animated.View>

        <View style={styles.contentContainer}>
          <GlassBox style={styles.card}>
            {/* Heading */}
            <Animated.View style={[styles.headingWrap, anim(0)]}>
              <Text style={styles.heading}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your journey</Text>
            </Animated.View>

            {/* Email */}
            <Animated.View style={[styles.inputWrap, emailFocused && styles.inputFocused, anim(1)]}>
              <Mail color={emailFocused ? theme.colors.accent : theme.colors.secondaryText} size={18} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={theme.colors.secondaryText + '90'}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Animated.View>

            {/* Password */}
            <Animated.View style={[styles.inputWrap, passFocused && styles.inputFocused, anim(2)]}>
              <Lock color={passFocused ? theme.colors.accent : theme.colors.secondaryText} size={18} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.secondaryText + '90'}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                secureTextEntry
              />
            </Animated.View>

            <Animated.View style={[{ alignSelf: 'flex-end', marginBottom: 20 }, anim(3)]}>
              <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* CTA */}
            <Animated.View style={[{ width: '100%' }, anim(4)]}>
              <TouchableOpacity
                onPress={handleLogin}
                onPressIn={onBtnPressIn}
                onPressOut={onBtnPressOut}
                activeOpacity={0.9}
                disabled={isLoading}
              >
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <LinearGradient
                    colors={gradients.accentVibrant as [string, string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.ctaBtn}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Text style={styles.ctaText}>Sign In</Text>
                        <ArrowRight color="#FFF" size={20} strokeWidth={2.5} />
                      </>
                    )}
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <Animated.View style={[styles.dividerRow, anim(5)]}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            {/* Social */}
            <Animated.View style={[styles.socialRow, anim(5)]}>
              <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleLogin} disabled={isLoading} activeOpacity={0.7}>
                <Globe color={theme.colors.primaryText} size={18} strokeWidth={1.8} />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} onPress={handleAppleLogin} disabled={isLoading} activeOpacity={0.7}>
                <Apple color={theme.colors.primaryText} size={18} strokeWidth={1.8} />
                <Text style={styles.socialText}>Apple</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footer, anim(6)]}>
              <Text style={styles.footerText}>New to Monara? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>Create an account</Text>
              </TouchableOpacity>
            </Animated.View>
          </GlassBox>
        </View>
      </KeyboardAvoidingView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 200,
    height: 72,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.secondaryText,
    letterSpacing: 0.8,
    marginTop: 6,
  },
  contentContainer: {
    width: '100%',
  },
  card: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 28,
  },
  headingWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.primaryText,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.secondaryText,
    marginTop: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 16,
    marginBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.divider,
  },
  inputFocused: {
    borderColor: theme.colors.accent + '60',
    backgroundColor: theme.colors.accent + '06',
  },
  input: {
    flex: 1,
    height: 54,
    color: theme.colors.primaryText,
    fontSize: 15,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  dividerText: {
    marginHorizontal: 16,
    color: theme.colors.secondaryText,
    fontSize: 13,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  socialText: {
    color: theme.colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 28,
  },
  footerText: {
    color: theme.colors.secondaryText,
    fontSize: 14,
    fontWeight: '400',
  },
  footerLink: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
