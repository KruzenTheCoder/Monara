import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../utils/theme';

interface GlassBoxProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  glow?: boolean;
  glowColor?: string;
  noPadding?: boolean;
}

const OUTER_KEYS = new Set([
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginVertical', 'marginHorizontal',
  'position', 'top', 'left', 'right', 'bottom', 'zIndex',
  'flex', 'flexGrow', 'flexShrink', 'flexBasis',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'aspectRatio',
]);

function splitStyle(style?: StyleProp<ViewStyle>): [ViewStyle, ViewStyle] {
  if (!style) return [{}, {}];
  const flat = (StyleSheet.flatten(style) || {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const key of Object.keys(flat)) {
    if (OUTER_KEYS.has(key)) {
      outer[key] = flat[key];
    } else {
      inner[key] = flat[key];
    }
  }
  return [outer as ViewStyle, inner as ViewStyle];
}

export const GlassBox: React.FC<GlassBoxProps> = ({
  children,
  style,
  intensity = 60,
  noPadding = false,
}) => {
  const [outerStyle, innerStyle] = splitStyle(style);
  const isDark = theme.isDark;

  const bg = isDark ? 'rgba(22, 22, 29, 0.82)' : 'rgba(255, 255, 255, 0.92)';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  return (
    <View
      style={[
        {
          borderRadius: 18,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: border,
          backgroundColor: Platform.OS === 'android' ? bg : 'transparent',
          ...Platform.select({
            ios: {
              shadowColor: isDark ? '#000' : '#0D1B2A',
              shadowOpacity: isDark ? 0.28 : 0.08,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
            },
            android: {
              elevation: 6,
            },
          }),
        },
        outerStyle,
      ]}
    >
      {/* iOS: real blur   Android: solid tinted bg (already on wrapper) */}
      {Platform.OS === 'ios' && (
        <>
          <BlurView
            intensity={intensity}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? 'rgba(22,22,29,0.55)' : 'rgba(255,255,255,0.72)' },
            ]}
          />
        </>
      )}

      {/* Top highlight — subtle inner glow for depth */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
        }}
      />

      <View style={[!noPadding && styles.content, innerStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
});
