import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../utils/theme';

interface GlassBoxProps {
  children: React.ReactNode;
  style?: ViewStyle;
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

function splitStyle(style?: ViewStyle): [ViewStyle, ViewStyle] {
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
  noPadding = false,
}) => {
  const [outerStyle, innerStyle] = splitStyle(style);

  return (
    <View style={[styles.container, outerStyle]}>
      <View style={[!noPadding && styles.content, innerStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    backgroundColor: theme.colors.glassBackground,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  content: {
    padding: 16,
  },
});
