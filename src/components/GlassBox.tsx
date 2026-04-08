import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../utils/theme';

interface GlassBoxProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  glow?: boolean;
  glowColor?: string;
  noPadding?: boolean;
  accentBorder?: boolean;
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
  accentBorder = false,
}) => {
  const [outerStyle, innerStyle] = splitStyle(style);
  const isDark = theme.isDark;

  const bg = isDark ? 'rgba(19, 19, 24, 0.88)' : 'rgba(255, 255, 255, 0.95)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,26,46,0.05)';

  return (
    <View
      style={[
        {
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: accentBorder ? theme.colors.accent + '30' : border,
          backgroundColor: Platform.OS === 'android' ? bg : 'transparent',
          ...Platform.select({
            ios: {
              shadowColor: isDark ? '#000' : '#0F1A2E',
              shadowOpacity: isDark ? 0.32 : 0.08,
              shadowRadius: 24,
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
              { backgroundColor: isDark ? 'rgba(19,19,24,0.62)' : 'rgba(255,255,255,0.78)' },
            ]}
          />
        </>
      )}

      {/* Premium top highlight — gradient shimmer for depth */}
      <LinearGradient
        colors={
          accentBorder
            ? [`${theme.colors.accent}40`, `${theme.colors.accent}08`]
            : isDark
              ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']
              : ['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.4)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1.5,
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
