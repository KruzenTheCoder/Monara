import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions } from 'react-native';
import { theme } from '../utils/theme';
import { GlassBox } from './GlassBox';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string | React.ReactNode;
  primaryAction?: {
    label: string;
    onPress: () => void;
    color?: string;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
    color?: string;
  };
  onClose: () => void;
  icon?: React.ReactNode;
}

const { width } = Dimensions.get('window');

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  primaryAction,
  secondaryAction,
  onClose,
  icon,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: fadeAnim }
          ]}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <GlassBox style={styles.alertBox} noPadding>
            <View style={styles.header}>
              {icon && <View style={styles.iconWrap}>{icon}</View>}
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
              >
                <X color="#A0A0A0" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {typeof message === 'string' ? (
                <Text style={styles.message}>{message}</Text>
              ) : (
                message
              )}
            </View>

            <View style={styles.actions}>
              {secondaryAction && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.secondaryBtn]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    secondaryAction.onPress();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionText, { color: secondaryAction.color || '#A0A0A0' }]}>
                    {secondaryAction.label}
                  </Text>
                </TouchableOpacity>
              )}
              {primaryAction && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.primaryBtn,
                    { backgroundColor: primaryAction.color || theme.colors.accent },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    primaryAction.onPress();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionText, styles.primaryText]}>
                    {primaryAction.label}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </GlassBox>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 380,
    zIndex: 10,
  },
  alertBox: {
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconWrap: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  message: {
    fontSize: 15,
    color: '#E0E0E0',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  primaryBtn: {
    // Background color set dynamically
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryText: {
    color: '#121212',
    fontWeight: '700',
  },
});