import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../utils/theme';
import { AlertCircle, Trash2, CheckCircle2, Info, Camera, X } from 'lucide-react-native';

/* ─── types ─── */
export type AlertVariant = 'default' | 'destructive' | 'success' | 'info' | 'photo';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface StyledAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss: () => void;
  variant?: AlertVariant;
}

/* ─── colours per variant ─── */
const VARIANT_META: Record<AlertVariant, { color: string; Icon: React.ComponentType<any> }> = {
  default:     { color: theme.colors.accent,       Icon: Info },
  destructive: { color: theme.colors.status.red,   Icon: Trash2 },
  success:     { color: theme.colors.status.green,  Icon: CheckCircle2 },
  info:        { color: '#3B82F6',                  Icon: AlertCircle },
  photo:       { color: theme.colors.accent,        Icon: Camera },
};

const { width } = Dimensions.get('window');

/* ─── component ─── */
export const StyledAlert: React.FC<StyledAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
  variant = 'default',
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      onDismiss();
      cb?.();
    });
  };

  const { color, Icon } = VARIANT_META[variant];

  // separate cancel vs normal vs destructive buttons
  const cancelBtn = buttons.find(b => b.style === 'cancel');
  const actionBtns = buttons.filter(b => b.style !== 'cancel');

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()}>
          <BlurView intensity={40} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        </Pressable>

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* accent bar */}
          <View style={[styles.accentBar, { backgroundColor: color }]} />

          {/* icon circle */}
          <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
            <Icon color={color} size={28} strokeWidth={2} />
          </View>

          {/* title */}
          <Text style={styles.title}>{title}</Text>

          {/* message */}
          {!!message && <Text style={styles.message}>{message}</Text>}

          {/* buttons */}
          <View style={styles.buttonArea}>
            {actionBtns.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const btnColor = isDestructive ? theme.colors.status.red : color;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: isDestructive ? `${btnColor}20` : `${btnColor}25`, borderColor: `${btnColor}60` },
                  ]}
                  onPress={() => close(btn.onPress)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.actionBtnText, { color: btnColor }]}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}

            {cancelBtn && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => close(cancelBtn.onPress)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>{cancelBtn.text}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

/* ─── singleton API ─── */
type AlertState = Omit<StyledAlertProps, 'onDismiss'>;

let _setAlert: React.Dispatch<React.SetStateAction<AlertState | null>> | null = null;

/**
 * Drop-in replacement for Alert.alert() that uses the styled modal.
 */
export function showStyledAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  variant?: AlertVariant,
) {
  _setAlert?.({
    visible: true,
    title,
    message,
    buttons: buttons || [{ text: 'OK', style: 'default' }],
    variant: variant || inferVariant(buttons),
  });
}

function inferVariant(buttons?: AlertButton[]): AlertVariant {
  if (buttons?.some(b => b.style === 'destructive')) return 'destructive';
  return 'default';
}

/**
 * Render at the root of your app (inside NavigationContainer) to enable showStyledAlert().
 */
export const StyledAlertProvider: React.FC = () => {
  const [alert, setAlert] = React.useState<AlertState | null>(null);

  useEffect(() => {
    _setAlert = setAlert;
    return () => { _setAlert = null; };
  }, []);

  if (!alert) return null;

  return (
    <StyledAlert
      visible={alert.visible}
      title={alert.title}
      message={alert.message}
      buttons={alert.buttons}
      variant={alert.variant}
      onDismiss={() => setAlert(null)}
    />
  );
};

/* ─── styles ─── */
const CARD_W = Math.min(width - 48, 340);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_W,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 20,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryText,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: theme.colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  buttonArea: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(27,42,74,0.05)',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.secondaryText,
  },
});
