import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, Animated, Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GlassBox } from '../../components/GlassBox';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { theme, gradients } from '../../utils/theme';
import { Mail, Lock, User, ArrowRight } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { showStyledAlert } from '../../components/StyledAlert';

export const RegisterScreen = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const { signUpWithEmail } = useAuth();
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
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    anims.forEach((a, i) => {
      Animated.parallel([
        Animated.timing(a.opacity, { toValue: 1, duration: 500, delay: 250 + i * 70, useNativeDriver: true }),
        Animated.spring(a.translateY, { toValue: 0, tension: 80, friction: 12, delay: 250 + i * 70, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      showStyledAlert('Missing Information', 'Please fill in all fields to continue.', undefined, 'destructive');
      return;
    }
    if (password.length < 6) {
      showStyledAlert('Weak Password', 'Your password must be at least 6 characters long.', undefined, 'destructive');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    const { error } = await signUpWithEmail(email, password, fullName);
    setIsLoading(false);
    if (error) {
      showStyledAlert('Registration Failed', error.message, undefined, 'destructive');
    } else {
      showStyledAlert('Verification Link Sent', 'Please check your email to confirm your account.', undefined, 'success');
      navigation.navigate('Login');
    }
  };

  const onBtnPressIn = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const onBtnPressOut = () => Animated.spring(btnScale, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }).start();

  const anim = (i: number) => ({ opacity: anims[i].opacity, transform: [{ translateY: anims[i].translateY }] });

  const InputRow = ({ icon: Icon, focused, ...rest }: any) => (
    <Animated.View style={[styles.inputWrap, focused && styles.inputFocused, anim(rest.animIdx)]}>
      <Icon color={focused ? theme.colors.accent : theme.colors.secondaryText} size={18} />
      <TextInput
        style={styles.input}
        placeholderTextColor={theme.colors.secondaryText + '90'}
        {...rest}
      />
    </Animated.View>
  );

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
        </Animated.View>

        <View style={styles.contentContainer}>
          <GlassBox style={styles.card}>
            {/* Heading */}
            <Animated.View style={[styles.headingWrap, anim(0)]}>
              <Text style={styles.heading}>Create Account</Text>
              <Text style={styles.subtitle}>Start your journey to financial clarity</Text>
            </Animated.View>

            {/* Name */}
            <Animated.View style={[styles.inputWrap, nameFocused && styles.inputFocused, anim(1)]}>
              <User color={nameFocused ? theme.colors.accent : theme.colors.secondaryText} size={18} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={theme.colors.secondaryText + '90'}
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
              />
            </Animated.View>

            {/* Email */}
            <Animated.View style={[styles.inputWrap, emailFocused && styles.inputFocused, anim(2)]}>
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
            <Animated.View style={[styles.inputWrap, passFocused && styles.inputFocused, anim(3)]}>
              <Lock color={passFocused ? theme.colors.accent : theme.colors.secondaryText} size={18} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={theme.colors.secondaryText + '90'}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                secureTextEntry
              />
            </Animated.View>

            {/* CTA */}
            <Animated.View style={[{ width: '100%', marginTop: 8 }, anim(4)]}>
              <TouchableOpacity
                onPress={handleRegister}
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
                        <Text style={styles.ctaText}>Get Started</Text>
                        <ArrowRight color="#FFF" size={20} strokeWidth={2.5} />
                      </>
                    )}
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footer, anim(5)]}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Sign in</Text>
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
    marginBottom: 28,
  },
  logoImage: {
    width: 180,
    height: 64,
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
