import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassBox } from '../../components/GlassBox';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { theme } from '../../utils/theme';
import { Mail, Lock, LogIn } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { showStyledAlert } from '../../components/StyledAlert';

const { height } = Dimensions.get('window');

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    if (!email || !password) {
      showStyledAlert('Missing Information', 'Please provide both email and password.', undefined, 'destructive');
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithEmail(email, password);
    setIsLoading(false);

    if (error) {
      showStyledAlert('Login Failed', error.message, undefined, 'destructive');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    setIsLoading(false);
    if (error) {
      showStyledAlert('Google Login Failed', error.message, undefined, 'destructive');
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    const { error } = await signInWithApple();
    setIsLoading(false);
    if (error) {
      showStyledAlert('Apple Login Failed', error.message, undefined, 'destructive');
    }
  };

  return (
    <AnimatedBackground>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/monara-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.contentContainer}>
          <GlassBox style={styles.card}>
            <Text style={theme.typography.h1}>Welcome Back</Text>
            <Text style={[theme.typography.body, styles.subtitle]}>
              Securely access your wealth ecosystem.
            </Text>

            <View style={styles.inputContainer}>
              <Mail color={theme.colors.secondaryText} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={theme.colors.secondaryText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock color={theme.colors.secondaryText} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.secondaryText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('ResetPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <LogIn color="#FFF" size={20} style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin} disabled={isLoading}>
                 <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin} disabled={isLoading}>
                 <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New to Monara? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>Create an account</Text>
              </TouchableOpacity>
            </View>
          </GlassBox>
        </View>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 220,
    height: 80,
  },
  contentContainer: {
    width: '100%',
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
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: theme.colors.primaryText,
    fontSize: 16,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    ...theme.typography.label,
    color: theme.colors.accent,
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
    marginRight: 8,
  },
  buttonText: {
    ...theme.typography.h2,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  dividerText: {
    marginHorizontal: 16,
    color: theme.colors.secondaryText,
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
  },
  socialButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonText: {
    color: theme.colors.primaryText,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
  },
  footerText: {
    color: theme.colors.secondaryText,
    fontSize: 14,
  },
  footerLink: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
