import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

// Necessary for web browser to close properly when doing OAuth
WebBrowser.maybeCompleteAuthSession();

// Define context type
interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithApple: async () => ({ error: null }),
  signOut: async () => {},
});

const handleOAuthRedirect = async (url: string) => {
  // Parse access_token and refresh_token from url hash or query
  const params = url.split('#')[1] || url.split('?')[1];
  if (!params) throw new Error('No tokens found in URL');
  
  const searchParams = new URLSearchParams(params);
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  } else {
    throw new Error('Missing access or refresh token in URL');
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: fullName,
        },
        emailRedirectTo: AuthSession.makeRedirectUri(),
      },
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: AuthSession.makeRedirectUri(),
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = AuthSession.makeRedirectUri();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No URL returned from Supabase for Google OAuth');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        await handleOAuthRedirect(result.url);
      }
      
      return { error: null };
    } catch (e: any) {
      console.error('Google Auth Error:', e);
      return { error: e };
    }
  };

  const signInWithApple = async () => {
    try {
      if (Platform.OS === 'ios') {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (credential.identityToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
          });
          if (error) throw error;
          return { error: null };
        } else {
          throw new Error('No identityToken.');
        }
      } else {
        const redirectUrl = AuthSession.makeRedirectUri();
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No URL returned from Supabase for Apple OAuth');

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success') {
          await handleOAuthRedirect(result.url);
        }
        return { error: null };
      }
    } catch (e: any) {
      if (e.code === 'ERR_CANCELED') {
        return { error: null };
      }
      console.error('Apple Auth Error:', e);
      return { error: e };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      isLoading,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      signInWithGoogle,
      signInWithApple,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
