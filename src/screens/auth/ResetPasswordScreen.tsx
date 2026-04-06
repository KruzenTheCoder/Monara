import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassBox } from '../../components/GlassBox';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { theme } from '../../utils/theme';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { showStyledAlert } from '../../components/StyledAlert';

const { height } = Dimensions.get('window');

export const ResetPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();
  const navigation = useNavigation<any>();

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.primaryText} size={24} />
        </TouchableOpacity>
      </View>

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
            
            <Text style={theme.typography.h1}>Reset Password</Text>
            <Text style={[theme.typography.body, styles.subtitle]}>
              Enter your email address to receive a secure reset link.
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

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleReset}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
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
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 24,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
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
    marginBottom: 24,
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
});
