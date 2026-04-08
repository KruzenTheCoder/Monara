import React, { useState, useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import {
  Home,
  PlusCircle,
  PieChart,
  Star,
  BarChart2,
  X,
  TrendingDown,
  TrendingUp,
  Calendar,
} from 'lucide-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { TrackingScreen } from '../screens/TrackingScreen';
import { BudgetScreen } from '../screens/BudgetScreen';
import { RewardsScreen } from '../screens/RewardsScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme } from '../utils/theme';

const Tab = createBottomTabNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TabLabel = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
    {label}
  </Text>
);

// Only two quick actions - Expense and Income
const quickActions = [
  { id: 'expense', label: 'Add Expense', icon: TrendingDown, color: '#EF4444', type: 'expense' },
  { id: 'income', label: 'Add Income', icon: TrendingUp, color: '#10B981', type: 'income' },
  { id: 'bill', label: 'Add Bill', icon: Calendar, color: '#3E92CC', type: 'bill' },
];

// Animated Action Button Component
const ActionButton = ({
  item,
  index,
  isVisible,
  onPress
}: {
  item: typeof quickActions[0];
  index: number;
  isVisible: boolean;
  onPress: () => void;
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(animatedValue, {
          toValue: 1,
          delay: index * 80,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          delay: index * 80,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const Icon = item.icon;

  return (
    <Animated.View
      style={[
        styles.actionItem,
        {
          opacity: animatedValue,
          transform: [
            { scale: scaleValue },
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.actionItemButton}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[item.color, `${item.color}CC`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionItemGradient}
        >
          <Icon color="#FFFFFF" size={28} strokeWidth={2} />
        </LinearGradient>
        <Text style={styles.actionItemLabel}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Animated Gradient Background
const AnimatedGradientBackground = ({ isVisible }: { isVisible: boolean }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isVisible]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: animatedValue,
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(62, 146, 204, 0.12)', 'rgba(62, 146, 204, 0.04)', 'transparent']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

// Main Popup Component
const AddPopup = ({
  visible,
  onClose,
  onActionPress
}: {
  visible: boolean;
  onClose: () => void;
  onActionPress: (actionType: 'expense' | 'income' | 'bill') => void;
}) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const containerScale = useRef(new Animated.Value(0.8)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const closeButtonRotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(containerScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(containerOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(closeButtonRotation, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for the glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(closeButtonRotation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const closeRotation = closeButtonRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: backdropOpacity }
          ]}
        >
          <BlurView intensity={40} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <Pressable
            style={[StyleSheet.absoluteFill, styles.backdrop]}
            onPress={onClose}
          />
        </Animated.View>

        {/* Animated Gradient Background */}
        <AnimatedGradientBackground isVisible={visible} />

        {/* Content - Centered */}
        <View style={styles.popupContentWrapper}>
          <Animated.View
            style={[
              styles.popupContent,
              {
                opacity: containerOpacity,
                transform: [{ scale: containerScale }],
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.divider,
              },
            ]}
          >
            <View style={styles.popupInner}>
              {/* Glow effect */}
              <Animated.View
                style={[
                  styles.glowContainer,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <LinearGradient
                  colors={['rgba(62, 146, 204, 0.2)', 'rgba(62, 146, 204, 0)']}
                  style={styles.glow}
                />
              </Animated.View>

              {/* Title Section */}
              <View style={styles.titleSection}>
                <View style={styles.titleLine} />
                <Text style={styles.popupTitle}>Quick Action</Text>
                <View style={styles.titleLine} />
              </View>

              <Text style={[styles.popupSubtitle, { color: theme.colors.primaryText }]}>What would you like to log?</Text>

              {/* Action Grid */}
              <View style={styles.actionsRow}>
                {quickActions.map((action, index) => (
                  <ActionButton
                    key={action.id}
                    item={action}
                    index={index}
                    isVisible={visible}
                    onPress={() => onActionPress(action.type as 'expense' | 'income' | 'bill')}
                  />
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Close Button Pin */}
          <Animated.View
            style={[
              styles.closeButtonContainer,
              {
                opacity: containerOpacity,
                transform: [{ rotate: closeRotation }, { scale: containerScale }],
                marginBottom: insets.bottom + 16,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme.isDark ? ['#1C1C25', '#16161D'] : ['#FFFFFF', '#F0F1F5']}
                style={styles.closeButtonGradient}
              >
                <X color={theme.colors.secondaryText} size={24} strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

// Custom Center Button - BIGGER and elevated
const CenterTabButton = ({ onPress }: { onPress: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.centerButtonTouchable}
    >
      <Animated.View style={[styles.centerButtonWrapper, { transform: [{ scale: scaleAnim }] }]}>
        {/* Outer glow ring */}
        <View style={styles.outerGlowRing} />

        <LinearGradient
          colors={['#3E92CC', '#2B7AB5', '#1B6A9E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerButton}
        >
          <PlusCircle color="#FFFFFF" size={28} strokeWidth={2.5} />
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const RootNavigator = () => {
  const insets = useSafeAreaInsets();
  const [showPopup, setShowPopup] = useState(false);
  const navigation = useNavigation<any>();

  const TAB_BAR_HEIGHT = 60;
  // Android APK builds with edgeToEdgeEnabled draw behind the system nav bar.
  // insets.bottom can under-report on some devices, so use a generous minimum.
  const bottomPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 48) 
    : Math.max(insets.bottom, 8);

  const handleActionPress = (actionType: 'expense' | 'income' | 'bill') => {
    setShowPopup(false);

    // Small delay to let the modal close animation complete
    setTimeout(() => {
      if (actionType === 'bill') {
        navigation.navigate('Bills' as never, { openCreate: true } as never);
        return;
      }
      navigation.navigate('AddTransaction' as never, { type: actionType } as never);
    }, 250);
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: TAB_BAR_HEIGHT + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 10,
            paddingHorizontal: 8,
            backgroundColor: theme.isDark ? theme.colors.surface : '#FFFFFF',
            borderTopWidth: 0,
            elevation: 0,
            shadowColor: theme.isDark ? '#000' : '#0F1A2E',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: theme.isDark ? 0.3 : 0.08,
            shadowRadius: 16,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.secondaryText,
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: theme.colors.backgroundStart },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color }) => <Home color={color} size={22} strokeWidth={1.8} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Home" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            tabBarIcon: ({ color }) => <BarChart2 color={color} size={22} strokeWidth={1.8} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Analytics" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Tracking"
          component={TrackingScreen}
          options={{
            tabBarIcon: () => <CenterTabButton onPress={() => setShowPopup(true)} />,
            tabBarLabel: () => null,
            tabBarItemStyle: {
              height: TAB_BAR_HEIGHT + 20,
              marginTop: -20,
            },
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              setShowPopup(true);
            },
          })}
        />
        <Tab.Screen
          name="Budget"
          component={BudgetScreen}
          options={{
            tabBarIcon: ({ color }) => <PieChart color={color} size={22} strokeWidth={1.8} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Budget" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Rewards"
          component={RewardsScreen}
          options={{
            tabBarIcon: ({ color }) => <Star color={color} size={22} strokeWidth={1.8} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Rewards" focused={focused} />,
          }}
        />
      </Tab.Navigator>

      <AddPopup
        visible={showPopup}
        onClose={() => setShowPopup(false)}
        onActionPress={handleActionPress}
      />
    </>
  );
};

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.secondaryText,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  tabLabelFocused: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  centerButtonTouchable: {
    position: 'absolute',
    top: -20,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlowRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(62, 146, 204, 0.15)',
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.isDark ? theme.colors.surface : '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: theme.isDark ? '#000' : '#3E92CC',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: theme.colors.overlayBg,
  },
  popupContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContent: {
    width: SCREEN_WIDTH - 64,
    backgroundColor: theme.colors.surface,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: 'visible',
    shadowColor: theme.isDark ? '#000' : '#1B2A4A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 20,
  },
  popupInner: {
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 32,
  },
  glowContainer: {
    position: 'absolute',
    top: -150,
    width: 300,
    height: 300,
  },
  glow: {
    width: '100%',
    height: '100%',
    borderRadius: 150,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  titleLine: {
    height: 1,
    flex: 1,
    backgroundColor: theme.colors.divider,
  },
  popupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  popupSubtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primaryText,
    marginBottom: 32,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    width: '100%',
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
  },
  actionItemButton: {
    alignItems: 'center',
    width: '100%',
  },
  actionItemGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  actionItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
  closeButtonContainer: {
    marginTop: 24,
  },
  closeButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
