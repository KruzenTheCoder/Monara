import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassBox } from '../../components/GlassBox';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { theme } from '../../utils/theme';
import { Mail, Lock, User, ArrowRight } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { showStyledAlert } from '../../components/StyledAlert';

const { height } = Dimensions.get('window');

export const RegisterScreen = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUpWithEmail } = useAuth();
  const navigation = useNavigation<any>();

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      showStyledAlert('Missing Information', 'Please fill in all fields to continue.', undefined, 'destructive');
      return;
    }

    if (password.length < 6) {
      showStyledAlert('Weak Password', 'Your password must be at least 6 characters long.', undefined, 'destructive');
      return;
    }

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

  return (
    <AnimatedBackground>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.contentContainer}>
          <GlassBox style={styles.card}>
            <Image
              source={require('../../../assets/monara-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            
            <Text style={theme.typography.h1}>Create Account</Text>
            <Text style={[theme.typography.body, styles.subtitle]}>
              Join Monara and take control of your wealth.
            </Text>

            <View style={styles.inputContainer}>
              <User color={theme.colors.secondaryText} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={theme.colors.secondaryText}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

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
                placeholder="Password (min 6 characters)"
                placeholderTextColor={theme.colors.secondaryText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleRegister}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Get Started</Text>
                  <ArrowRight color="#FFF" size={20} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Sign in</Text>
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
  contentContainer: {
    width: '100%',
  },
  logoImage: {
    width: 180,
    height: 64,
    marginBottom: 16,
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    ...theme.typography.h2,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
