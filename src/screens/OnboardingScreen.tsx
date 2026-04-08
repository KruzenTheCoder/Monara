import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Linking,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, ChevronRight, Globe, Phone, X, Sparkles } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassBox } from '../components/GlassBox';
import { useAuth } from '../context/AuthContext';
import { useFinancial } from '../context/FinancialContext';
import { getAdapter } from '../db';
import { supabase } from '../lib/supabase';
import { COUNTRIES } from '../utils/countries';
import { getCurrencyInfo } from '../utils/currencies';
import { gradients, theme } from '../utils/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

type LifeContext = 'Student' | 'Recently Graduated' | 'Working Full-Time' | 'Looking for Work' | 'Self-Employed' | 'Other';
type Focus = 'Saving Money' | 'Getting out of debt' | 'Managing day-to-day spending' | 'Building better habits' | 'Just trying to feel more in control';
type Tracking = "I don't track it" | 'I check my bank occasionally' | 'I use notes/spreadsheets' | 'I use an app';
type Frequency = 'Daily' | 'Once a week' | 'Rarely';
type Friction = "I don't know where my money goes" | 'I overspend without realising' | 'I struggle to save' | 'I avoid looking at my finances' | 'It feels overwhelming' | "I start but don't stay consistent" | "I don't know";
type Feeling = 'In Control' | 'Okay, but could be better' | 'Stressed' | 'Avoidant' | 'Confused' | "I don't know";
type Insight =
  | '“I want to be better with money but don’t know where to start”'
  | '“I start tracking but fall off after a few days”'
  | '“I know what to do, I just don’t do it consistently”'
  | '“I’m already decent, just want to improve”'
  | "I don't know";
type Success = 'I saved some money' | 'I tracked consistently' | 'I feel more in control' | 'I reduced unnecessary spending' | 'I built a routine';
type SaveRange = '0' | '1-100' | '100-300' | '300+';
type Confidence = 'Very confident' | 'Somewhat confident' | 'Not very confident' | 'Not confident at all';

type OnboardingAnswers = {
  phone_area_code: string;
  phone_number: string;
  country_code: string;
  currency: string;
  life_context: LifeContext | '';
  main_focus: Focus | '';
  tracking_method: Tracking | '';
  tracking_app_name: string;
  check_frequency: Frequency | '';
  friction: Friction[];
  feeling: Feeling | '';
  behaviour_insight: Insight | '';
  fix_one_thing: string;
  success_30_days: Success | '';
  save_range: SaveRange | '';
  confidence: Confidence | '';
};

type Step =
  | { kind: 'question'; id: string; chapter: number }
  | { kind: 'interlude'; title: string; body: string; icon: any; chapter: number }
  | { kind: 'final'; id: 'final'; chapter: number };

// ============================================================================
// OPTIONS DATA
// ============================================================================

const lifeOptions: LifeContext[] = ['Student', 'Recently Graduated', 'Working Full-Time', 'Looking for Work', 'Self-Employed', 'Other'];
const focusOptions: Focus[] = ['Saving Money', 'Getting out of debt', 'Managing day-to-day spending', 'Building better habits', 'Just trying to feel more in control'];
const trackingOptions: Tracking[] = ["I don't track it", 'I check my bank occasionally', 'I use notes/spreadsheets', 'I use an app'];
const frequencyOptions: Frequency[] = ['Daily', 'Once a week', 'Rarely'];
const frictionOptions: Friction[] = ["I don't know where my money goes", 'I overspend without realising', 'I struggle to save', 'I avoid looking at my finances', 'It feels overwhelming', "I start but don't stay consistent", "I don't know"];
const feelingOptions: Feeling[] = ['In Control', 'Okay, but could be better', 'Stressed', 'Avoidant', 'Confused', "I don't know"];
const insightOptions: Insight[] = [
  '“I want to be better with money but don’t know where to start”',
  '“I start tracking but fall off after a few days”',
  '“I know what to do, I just don’t do it consistently”',
  '“I’m already decent, just want to improve”',
  "I don't know",
];
const successOptions: Success[] = ['I saved some money', 'I tracked consistently', 'I feel more in control', 'I reduced unnecessary spending', 'I built a routine'];
const saveRangeOptions: SaveRange[] = ['0', '1-100', '100-300', '300+'];
const confidenceOptions: Confidence[] = ['Very confident', 'Somewhat confident', 'Not very confident', 'Not confident at all'];

const defaultAnswers = (): OnboardingAnswers => ({
  phone_area_code: '+1',
  phone_number: '',
  country_code: 'US',
  currency: 'USD',
  life_context: '',
  main_focus: '',
  tracking_method: '',
  tracking_app_name: '',
  check_frequency: '',
  friction: [],
  feeling: '',
  behaviour_insight: '',
  fix_one_thing: '',
  success_30_days: '',
  save_range: '',
  confidence: '',
});

const AREA_CODE_OPTIONS = [
  { dial: '+1', country: 'United States', flag: '🇺🇸' },
  { dial: '+1', country: 'Canada', flag: '🇨🇦' },
  { dial: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { dial: '+27', country: 'South Africa', flag: '🇿🇦' },
  { dial: '+61', country: 'Australia', flag: '🇦🇺' },
  { dial: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { dial: '+254', country: 'Kenya', flag: '🇰🇪' },
  { dial: '+971', country: 'United Arab Emirates', flag: '🇦🇪' },
];

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', DE: 'EUR', FR: 'EUR', AU: 'AUD', NZ: 'NZD', JP: 'JPY',
};

// Keep onboarding styling aligned with the app's brand palette
const CHAPTER_COLORS: Array<readonly [string, string]> = [gradients.accent];

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

// Typewriter Text Effect
const TypewriterText: React.FC<{
  text: string;
  style?: any;
  delay?: number;
  speed?: number;
  onComplete?: () => void;
}> = ({ text, style, delay = 0, speed = 30, onComplete }) => {
  const [displayText, setDisplayText] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    setDisplayText('');
    opacity.setValue(0);
    const timeout = setTimeout(() => {
      if (cancelled) return;
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      let index = 0;
      interval = setInterval(() => {
        if (cancelled) return;
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          if (interval) clearInterval(interval);
          onComplete?.();
        }
      }, speed);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [delay, onComplete, opacity, speed, text]);

  return (
    <Animated.Text style={[style, { opacity }]}>
      {displayText}
      <Text style={{ opacity: 0.5 }}>|</Text>
    </Animated.Text>
  );
};

// Final Card (must be a component to keep hooks valid)
const FinalCard: React.FC<{
  visible: boolean;
  chapter: number;
  answers: Pick<OnboardingAnswers, 'country_code' | 'currency'>;
}> = ({ visible, chapter, answers }) => {
  const [titleComplete, setTitleComplete] = useState(false);

  useEffect(() => {
    if (visible) setTitleComplete(false);
  }, [visible]);

  return (
    <QuestionCard visible={visible} chapter={chapter}>
      <View style={styles.finalHeader}>
        <LinearGradient
          colors={CHAPTER_COLORS[5]}
          style={styles.finalIconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Sparkles color="#FFF" size={28} />
        </LinearGradient>
      </View>
      <TypewriterText
        text="You're all set."
        style={[styles.qTitle, { textAlign: 'center', fontSize: 20 }]}
        speed={35}
        onComplete={() => setTitleComplete(true)}
      />
      <StaggeredItem index={0} visible={titleComplete}>
        <Text style={[styles.qSub, { textAlign: 'center', marginTop: 8 }]}>
          Welcome to early access
        </Text>
      </StaggeredItem>
      <StaggeredItem index={1} visible={titleComplete}>
        <View style={styles.finalStats}>
          <View style={styles.finalStatItem}>
            <Text style={styles.finalStatLabel}>Region</Text>
            <Text style={styles.finalStatValue}>{answers.country_code}</Text>
          </View>
          <View style={styles.finalStatDivider} />
          <View style={styles.finalStatItem}>
            <Text style={styles.finalStatLabel}>Currency</Text>
            <Text style={styles.finalStatValue}>{answers.currency}</Text>
          </View>
        </View>
      </StaggeredItem>
      <StaggeredItem index={2} visible={titleComplete}>
        <View style={styles.finalMessage}>
          <Text style={styles.finalText}>
            We look forward to you being our early access member. Use the app and we'll check in with you in 30 days!
          </Text>
        </View>
      </StaggeredItem>
      <StaggeredItem index={3} visible={titleComplete}>
        <Pressable onPress={() => Linking.openURL('mailto:info@monaramoney.com')} style={styles.supportButton}>
          <Text style={styles.supportLink}>info@monaramoney.com</Text>
        </Pressable>
      </StaggeredItem>
    </QuestionCard>
  );
};

// Staggered Animated List Item
const StaggeredItem: React.FC<{
  children: React.ReactNode;
  index: number;
  visible: boolean;
}> = ({ children, index, visible }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay: index * 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          delay: index * 80,
          stiffness: 100,
          damping: 15,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          delay: index * 80,
          stiffness: 100,
          damping: 15,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(30);
      scale.setValue(0.9);
    }
  }, [visible]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      {children}
    </Animated.View>
  );
};

// Ripple Effect Button
const RippleButton: React.FC<{
  children: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: any;
}> = ({ children, onPress, selected, disabled, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (selected) {
      if (!glowLoop.current) {
        glowLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        ])
        );
        glowLoop.current.start();
      }
    } else {
      glowLoop.current?.stop();
      glowLoop.current = null;
      glowOpacity.setValue(0);
    }
    return () => {
      glowLoop.current?.stop();
      glowLoop.current = null;
    };
  }, [glowOpacity, selected]);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, { toValue: 0.96, stiffness: 300, damping: 20, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, stiffness: 300, damping: 20, useNativeDriver: true }).start();
  };

  const handlePress = () => {
    rippleScale.setValue(0);
    rippleOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(rippleScale, { toValue: 3, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rippleOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[{ opacity: disabled ? 0.45 : 1 }]}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }], overflow: 'hidden' }]}>
        {/* Glow effect for selected */}
        {selected && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.colors.accent,
                opacity: glowOpacity,
                borderRadius: 16,
              },
            ]}
          />
        )}
        {/* Ripple */}
        <Animated.View
          style={[
            styles.ripple,
            {
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />
        {children}
      </Animated.View>
    </Pressable>
  );
};

// Progress Journey Line
const JourneyProgress: React.FC<{
  currentChapter: number;
  totalChapters: number;
  progress: Animated.Value;
}> = ({ currentChapter, totalChapters, progress }) => {
  return (
    <View style={styles.journeyContainer}>
      {Array.from({ length: totalChapters }).map((_, i) => {
        const isActive = i <= currentChapter;
        const isCurrent = i === currentChapter;
        return (
          <React.Fragment key={i}>
            <View style={[styles.journeyNode, isActive && styles.journeyNodeActive, isCurrent && styles.journeyNodeCurrent]}>
              {isCurrent && (
                <Animated.View
                  style={[
                    styles.journeyPulse,
                    {
                      transform: [
                        {
                          scale: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.5],
                          }),
                        },
                      ],
                      opacity: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 0],
                      }),
                    },
                  ]}
                />
              )}
            </View>
            {i < totalChapters - 1 && (
              <View style={styles.journeyLineContainer}>
                <View style={styles.journeyLine} />
                {i < currentChapter && <View style={[styles.journeyLine, styles.journeyLineFilled]} />}
              </View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

// Cinematic Chapter Card
const ChapterCard: React.FC<{
  title: string;
  body: string;
  icon: any;
  chapter: number;
  visible: boolean;
  onComplete: () => void;
}> = ({ title, body, icon: Icon, chapter, visible, onComplete }) => {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    // Reset state/animated values so each interlude can re-run cleanly
    setShowText(false);
    scale.setValue(0.8);
    opacity.setValue(0);
    translateY.setValue(50);
    iconRotate.setValue(0);
    iconScale.setValue(0);
    lineWidth.setValue(0);

    if (visible) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, stiffness: 100, damping: 15, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, stiffness: 100, damping: 15, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(iconScale, { toValue: 1, stiffness: 200, damping: 12, useNativeDriver: true }),
          Animated.timing(iconRotate, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        ]),
        Animated.timing(lineWidth, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]).start(() => setShowText(true));

      // Auto dismiss after delay
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -30, duration: 300, useNativeDriver: true }),
        ]).start(onComplete);
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [body, chapter, iconRotate, iconScale, lineWidth, opacity, onComplete, scale, title, translateY, visible]);

  const colors = CHAPTER_COLORS[chapter % CHAPTER_COLORS.length];

  return (
    <Animated.View
      style={[
        styles.chapterOverlay,
        {
          opacity,
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      <BlurView intensity={60} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[`${colors[0]}20`, `${colors[1]}10`] as const}
        style={[StyleSheet.absoluteFill]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.chapterContent}>
        <View style={styles.chapterIconContainer}>
          <LinearGradient
            colors={colors}
            style={styles.chapterIconBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View
              style={{
                transform: [
                  { scale: iconScale },
                  { rotate: iconRotate.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) },
                ],
              }}
            >
              <Icon color="#FFF" size={32} />
            </Animated.View>
          </LinearGradient>
        </View>
        <Text style={styles.chapterNumber}>Chapter {chapter + 1}</Text>
        <Animated.View
          style={[
            styles.chapterLine,
            {
              backgroundColor: colors[0],
              width: lineWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }),
            },
          ]}
        />
        {showText ? (
          <>
            <TypewriterText text={title} style={styles.chapterTitle} speed={40} />
            <Text style={styles.chapterBody}>{body}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.chapterTitle, { opacity: 0 }]}>{title}</Text>
            <Text style={[styles.chapterBody, { opacity: 0 }]}>{body}</Text>
          </>
        )}
      </View>
    </Animated.View>
  );
};

// Animated Question Card Wrapper
const QuestionCard: React.FC<{
  children: React.ReactNode;
  visible: boolean;
  chapter: number;
}> = ({ children, visible, chapter }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(100)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const rotateY = useRef(new Animated.Value(-15)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, stiffness: 100, damping: 20, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, stiffness: 80, damping: 15, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, stiffness: 100, damping: 15, useNativeDriver: true }),
        Animated.spring(rotateY, { toValue: 0, stiffness: 80, damping: 15, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateX.setValue(100);
      scale.setValue(0.95);
      rotateY.setValue(-15);
    }
  }, [visible]);

  const colors = CHAPTER_COLORS[chapter % CHAPTER_COLORS.length];

  return (
    <Animated.View
      style={[
        styles.questionCardWrapper,
        {
          opacity,
          transform: [
            { perspective: 1000 },
            { translateX },
            { scale },
            { rotateY: rotateY.interpolate({ inputRange: [-15, 0], outputRange: ['-15deg', '0deg'] }) },
          ],
        },
      ]}
    >
      {/* Accent border glow */}
      <LinearGradient
        colors={[`${colors[0]}30`, `${colors[1]}10`]}
        style={styles.questionCardGlow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <GlassBox style={styles.stageCard} accentBorder>
        {children}
      </GlassBox>
    </Animated.View>
  );
};

// Single Select with Animation
const AnimatedSingleSelect: React.FC<{
  title: string;
  subtitle?: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  onNext?: () => void;
  visible: boolean;
  chapter: number;
}> = ({ title, subtitle, options, value, onSelect, onNext, visible, chapter }) => {
  const [titleComplete, setTitleComplete] = useState(false);

  useEffect(() => {
    setTitleComplete(false);
  }, [title]);

  return (
    <QuestionCard visible={visible} chapter={chapter}>
      <TypewriterText
        text={title}
        style={styles.qTitle}
        speed={25}
        onComplete={() => setTitleComplete(true)}
      />
      {!!subtitle && (
        <StaggeredItem index={0} visible={titleComplete}>
          <Text style={styles.qSub}>{subtitle}</Text>
        </StaggeredItem>
      )}
      <View style={{ marginTop: 16, gap: 12 }}>
        {options.map((opt, idx) => {
          const selected = value === opt;
          return (
            <StaggeredItem key={opt} index={idx + 1} visible={titleComplete}>
              <RippleButton
                onPress={() => {
                  onSelect(opt);
                  onNext?.();
                }}
                selected={selected}
                style={[styles.selectCard, selected && styles.selectCardOn]}
              >
                <View style={styles.selectCardInner}>
                  <Text style={[styles.selectCardText, selected && styles.selectCardTextOn]}>{opt}</Text>
                  {selected && (
                    <Animated.View style={styles.checkMark}>
                      <Check color={theme.colors.accent} size={18} />
                    </Animated.View>
                  )}
                </View>
              </RippleButton>
            </StaggeredItem>
          );
        })}
      </View>
    </QuestionCard>
  );
};

// Multi Select Friction
const AnimatedMultiSelectFriction: React.FC<{
  value: Friction[];
  onToggle: (v: Friction) => void;
  visible: boolean;
  chapter: number;
}> = ({ value, onToggle, visible, chapter }) => {
  const [titleComplete, setTitleComplete] = useState(false);

  useEffect(() => {
    if (visible) setTitleComplete(false);
  }, [visible]);

  return (
    <QuestionCard visible={visible} chapter={chapter}>
      <TypewriterText
        text="What feels hardest about managing your money?"
        style={styles.qTitle}
        speed={25}
        onComplete={() => setTitleComplete(true)}
      />
      <StaggeredItem index={0} visible={titleComplete}>
        <Text style={styles.qSub}>Pick up to 2</Text>
      </StaggeredItem>
      <View style={styles.gridWrap}>
        {frictionOptions.map((opt, idx) => {
          const selected = value.includes(opt);
          const disabled = !selected && value.length >= 2;
          return (
            <StaggeredItem key={opt} index={idx + 1} visible={titleComplete}>
              <RippleButton
                onPress={() => onToggle(opt)}
                disabled={disabled}
                selected={selected}
                style={[styles.gridCard, selected && styles.gridCardOn, { width: '100%' }]}
              >
                <Text style={[styles.gridText, selected && styles.gridTextOn]}>{opt}</Text>
              </RippleButton>
            </StaggeredItem>
          );
        })}
      </View>
      <StaggeredItem index={frictionOptions.length + 1} visible={titleComplete}>
        <View style={styles.gridFooter}>
          <Text style={styles.gridHint}>Selected: {value.length}/2</Text>
          {value.length === 2 && (
            <View style={styles.readyBadge}>
              <Sparkles color={theme.colors.accent} size={14} />
              <Text style={styles.gridHintStrong}>Ready to continue</Text>
            </View>
          )}
        </View>
      </StaggeredItem>
    </QuestionCard>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OnboardingScreen: React.FC<{ onFinished: () => void }> = ({ onFinished }) => {
  const { user: authUser } = useAuth();
  const { updateUser } = useFinancial();
  const insets = useSafeAreaInsets();
  const userId = authUser?.id || 'local';
  const storageKey = useMemo(() => `@monara:onboarding:${userId}`, [userId]);

  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers());
  const [finishing, setFinishing] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const [activeIndex, setActiveIndex] = useState(0);
  const [showContent, setShowContent] = useState(true);
  const mountedRef = useRef(true);

  const progressPulse = useRef(new Animated.Value(0)).current;
  const ctaScaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundHue = useRef(new Animated.Value(0)).current;

  const [sheet, setSheet] = useState<{ type: 'area' | 'country' } | null>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const [sheetQuery, setSheetQuery] = useState('');

  const steps = useMemo<Step[]>(() => {
    const q = (id: string, ch: number): Step => ({ kind: 'question', id, chapter: ch });
    
    return [
      q('q1', 0),
      q('q2', 0),
      q('q4', 1),
      q('q5', 1),
      q('q6', 2),
      q('q7', 2),
      q('q8', 3),
      q('q9', 3),
      q('q10', 4),
      q('q11', 4),
      q('q12', 4),
      q('q13', 5),
      q('q14', 5),
      { kind: 'final', id: 'final', chapter: 5 },
    ];
  }, []);

  const current = steps[activeIndex];
  const currentChapter = current.chapter;
  const totalChapters = 6;

  // Progress pulse animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(progressPulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progressPulse]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load saved data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = getAdapter();
        if (db.getOnboarding) {
          const remote = await db.getOnboarding();
          if (!cancelled && remote?.answers) {
            setAnswers({ ...defaultAnswers(), ...(remote.answers as Partial<OnboardingAnswers>) });
          }
        }
        if (cancelled) return;
        const localRaw = await AsyncStorage.getItem(storageKey);
        if (localRaw) {
          const parsed = JSON.parse(localRaw) as { answers?: Partial<OnboardingAnswers> };
          if (parsed?.answers) setAnswers(a => ({ ...a, ...parsed.answers }));
        }
      } catch {
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storageKey]);

  useFocusEffect(
    useCallback(() => {
      (globalThis as any).__monaraSuppressNotifications = true;
      return () => { (globalThis as any).__monaraSuppressNotifications = false; };
    }, [])
  );

  const animateTo = async (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    if (nextIndex === activeIndex) return;

    const next = steps[nextIndex];

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowContent(false);
    await new Promise(r => setTimeout(r, 250));
    if (!mountedRef.current) return;
    setActiveIndex(nextIndex);
    setShowContent(true);
  };

  const goNext = async () => animateTo(activeIndex + 1);
  const goBack = async () => {
    const prevIdx = activeIndex - 1;
    if (prevIdx >= 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowContent(false);
      await new Promise(r => setTimeout(r, 200));
      if (!mountedRef.current) return;
      setActiveIndex(prevIdx);
      setShowContent(true);
    }
  };

  const openSheet = (type: 'area' | 'country') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheetQuery('');
    setSheet({ type });
    sheetAnim.setValue(0);
    Animated.spring(sheetAnim, { toValue: 1, stiffness: 120, damping: 18, useNativeDriver: true }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setSheet(null));
  };

  const onCtaPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(ctaScaleAnim, { toValue: 0.95, stiffness: 200, damping: 15, useNativeDriver: true }).start();
  };

  const onCtaPressOut = () => {
    Animated.spring(ctaScaleAnim, { toValue: 1, stiffness: 200, damping: 15, useNativeDriver: true }).start();
  };

  const finish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const completedAt = new Date().toISOString();
    await AsyncStorage.setItem(storageKey, JSON.stringify({ completed: true, completed_at: completedAt, answers }));
    try {
      const db = getAdapter();
      if (db.saveOnboarding) {
        await db.saveOnboarding({ completed: true, completed_at: completedAt, answers });
      }
    } catch {}
    try {
      const hasSupabase =
        !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (hasSupabase && authUser?.id) {
        await supabase
          .from('onboarding_responses')
          .upsert(
            {
              user_id: authUser.id,
              completed: true,
              completed_at: completedAt,
              answers: answers || {},
            },
            { onConflict: 'user_id' },
          );
      }
    } catch {}
    await updateUser({ country_code: answers.country_code, currency: answers.currency });
    setFinishing(true);
    (globalThis as any).__monaraSuppressNotifications = false;
    onFinished();
  };

  const canContinue = useMemo(() => {
    if (current.kind === 'final') return true;
    if (current.kind !== 'question') return false;
    switch (current.id) {
      case 'q1': return (answers.phone_number || '').trim().length >= 6;
      case 'q8': return answers.friction.length === 2;
      case 'q11': return (answers.fix_one_thing || '').trim().length > 0;
      case 'q6':
        if (answers.tracking_method === 'I use an app') return (answers.tracking_app_name || '').trim().length > 0;
        return true;
      default: return true;
    }
  }, [answers, current]);

  const ctaLabel = useMemo(() => {
    if (current.kind === 'final') return finishing ? 'Ready' : 'Begin Your Journey';
    if (current.kind === 'question' && current.id === 'q8') return 'Refine';
    return 'Continue';
  }, [current, finishing]);

  const onCtaPress = async () => {
    if (!canContinue) return;
    if (current.kind === 'final') {
      await finish();
      return;
    }
    await goNext();
  };

  const toggleFriction = (v: Friction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnswers(a => {
      const exists = a.friction.includes(v);
      if (exists) return { ...a, friction: a.friction.filter(x => x !== v) };
      if (a.friction.length >= 2) return a;
      return { ...a, friction: [...a.friction, v] };
    });
  };

  const countryOptions = useMemo(() => {
    const q = sheetQuery.trim().toLowerCase();
    const all = COUNTRIES.map(c => ({
      code: c.code,
      label: `${c.flag} ${c.name} (${c.code})`,
      currency: COUNTRY_CURRENCY[c.code] || 'USD',
    }));
    if (!q) return all;
    return all.filter(x => x.label.toLowerCase().includes(q) || x.currency.toLowerCase().includes(q));
  }, [sheetQuery]);

  const areaOptions = useMemo(() => {
    const q = sheetQuery.trim().toLowerCase();
    const all = AREA_CODE_OPTIONS.map(x => ({
      ...x,
      label: `${x.flag} ${x.country} (${x.dial})`,
      search: `${x.country} ${x.dial}`.toLowerCase(),
    }));
    if (!q) return all;
    return all.filter(x => x.search.includes(q));
  }, [sheetQuery]);

  const renderQuestion = (id: string, chapter: number) => {
    switch (id) {
      case 'q1':
        return (
          <QuestionCard visible={showContent} chapter={chapter}>
            <TypewriterText text="Mobile number" style={styles.qTitle} speed={30} />
            <StaggeredItem index={0} visible={showContent}>
              <Text style={styles.qSub}>Used for account recovery and reminders</Text>
            </StaggeredItem>
            <StaggeredItem index={1} visible={showContent}>
              <View style={{ marginTop: 14, flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => openSheet('area')} style={{ width: 104 }}>
                  <View style={styles.pillInput}>
                    <Phone color={theme.colors.accent} size={16} />
                    <Text style={styles.pillText}>
                      {(AREA_CODE_OPTIONS.find(x => x.dial === answers.phone_area_code)?.flag || '🌍')}{' '}
                      {answers.phone_area_code}
                    </Text>
                  </View>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.pillInput}
                    value={answers.phone_number}
                    onChangeText={v => setAnswers(a => ({ ...a, phone_number: v }))}
                    placeholder="Number"
                    placeholderTextColor={theme.colors.secondaryText}
                    keyboardType="phone-pad"
                    selectionColor={theme.colors.accent}
                  />
                </View>
              </View>
            </StaggeredItem>
          </QuestionCard>
        );

      case 'q2':
        return (
          <QuestionCard visible={showContent} chapter={chapter}>
            <TypewriterText text="Country / Region" style={styles.qTitle} speed={30} />
            <StaggeredItem index={0} visible={showContent}>
              <Text style={styles.qSub}>This sets your region and currency automatically</Text>
            </StaggeredItem>
            <StaggeredItem index={1} visible={showContent}>
              <Pressable onPress={() => openSheet('country')} style={{ marginTop: 14 }}>
                <View style={styles.pillInput}>
                  <Globe color={theme.colors.accent} size={16} />
                  <Text style={styles.pillText}>
                    {(COUNTRIES.find(c => c.code === answers.country_code)?.name || 'United States') + ` (${answers.country_code})`}
                  </Text>
                </View>
              </Pressable>
            </StaggeredItem>
            <StaggeredItem index={2} visible={showContent}>
              <View style={[styles.metaRow, { marginTop: 14 }]}>
                <Text style={styles.metaLabel}>Currency</Text>
                <View style={styles.currencyBadge}>
                  <Text style={[styles.metaValue, { color: theme.colors.accent }]}>
                    {answers.currency} · {(getCurrencyInfo(answers.currency)?.name || 'Currency')}
                  </Text>
                </View>
              </View>
            </StaggeredItem>
          </QuestionCard>
        );

      case 'q4':
        return (
          <AnimatedSingleSelect
            title="Which best describes you right now?"
            options={lifeOptions}
            value={answers.life_context}
            onSelect={v => setAnswers(a => ({ ...a, life_context: v as any }))}
            onNext={() => setTimeout(goNext, 350)}
            visible={showContent}
            chapter={chapter}
          />
        );

      case 'q5':
        return (
          <AnimatedSingleSelect
            title="What's your main financial focus right now?"
            options={focusOptions}
            value={answers.main_focus}
            onSelect={v => setAnswers(a => ({ ...a, main_focus: v as any }))}
            onNext={() => setTimeout(goNext, 350)}
            visible={showContent}
            chapter={chapter}
          />
        );

      case 'q6':
        return (
          <QuestionCard visible={showContent} chapter={chapter}>
            <TypewriterText text="How do you currently track your money?" style={styles.qTitle} speed={25} />
            <View style={{ marginTop: 16, gap: 12 }}>
              {trackingOptions.map((opt, idx) => {
                const selected = answers.tracking_method === opt;
                return (
                  <StaggeredItem key={opt} index={idx} visible={showContent}>
                    <RippleButton
                      onPress={() => {
                        setAnswers(a => ({ ...a, tracking_method: opt }));
                        if (opt !== 'I use an app') setTimeout(goNext, 400);
                      }}
                      selected={selected}
                      style={[styles.selectCard, selected && styles.selectCardOn]}
                    >
                      <View style={styles.selectCardInner}>
                        <Text style={[styles.selectCardText, selected && styles.selectCardTextOn]}>{opt}</Text>
                        {selected && <Check color={theme.colors.accent} size={18} />}
                      </View>
                    </RippleButton>
                  </StaggeredItem>
                );
              })}
            </View>
            {answers.tracking_method === 'I use an app' && (
              <StaggeredItem index={trackingOptions.length} visible={showContent}>
                <TextInput
                  style={[styles.expandInput, { height: 66, marginTop: 12 }]}
                  value={answers.tracking_app_name}
                  onChangeText={v => setAnswers(a => ({ ...a, tracking_app_name: v }))}
                  placeholder="Which app do you use?"
                  placeholderTextColor={theme.colors.secondaryText}
                  selectionColor={theme.colors.accent}
                />
              </StaggeredItem>
            )}
          </QuestionCard>
        );

      case 'q7':
        return (
          <AnimatedSingleSelect
            title="How often do you check your finances?"
            options={frequencyOptions}
            value={answers.check_frequency}
            onSelect={v => setAnswers(a => ({ ...a, check_frequency: v as any }))}
            onNext={() => setTimeout(goNext, 350)}
            visible={showContent}
            chapter={chapter}
          />
        );

      case 'q8':
        return <AnimatedMultiSelectFriction value={answers.friction} onToggle={toggleFriction} visible={showContent} chapter={chapter} />;

      case 'q9':
        return (
          <AnimatedSingleSelect
            title="When it comes to money, how do you feel most of the time?"
            options={feelingOptions}
            value={answers.feeling}
            onSelect={v => setAnswers(a => ({ ...a, feeling: v as any }))}
            onNext={() => setTimeout(goNext, 350)}
            visible={showContent}
            chapter={chapter}
          />
        );

      case 'q10':
        return (
          <AnimatedSingleSelect
            title="Which sounds most like you?"
            options={insightOptions}
            value={answers.behaviour_insight}
            onSelect={v => setAnswers(a => ({ ...a, behaviour_insight: v as any }))}
            onNext={() => setTimeout(goNext, 350)}
            visible={showContent}
            chapter={chapter}
          />
        );

      case 'q11':
        return (
          <QuestionCard visible={showContent} chapter={chapter}>
            <TypewriterText
              text="If you could fix ONE thing about your money in the next 30 days, what would it be?"
              style={styles.qTitle}
              speed={20}
            />
            <StaggeredItem index={0} visible={showContent}>
              <TextInput
                style={styles.expandInput}
                multiline
                value={answers.fix_one_thing}
                onChangeText={v => setAnswers(a => ({ ...a, fix_one_thing: v }))}
                placeholder="Write your answer..."
                placeholderTextColor={theme.colors.secondaryText}
                selectionColor={theme.colors.accent}
                textAlignVertical="top"
              />
            </StaggeredItem>
          </QuestionCard>
        );

      case 'q12':
        return (
          <AnimatedSingleSelect
            title="What would success look like for you in 30 days?"
            options={successOptions}
            value={answers.success_30_days}
            onSelect={v => setAnswers(a => ({ ...a, success_30_days: v as any }))}
            onNext={() => setTimeout(goNext, 350)}
            visible={showContent}
            chapter={chapter}
          />
        );

      case 'q13':
        return (
          <AnimatedSingleSelect
            title="Roughly how much do you save each month?"
            options={saveRangeOptions}
            value={answers.save_range}
            onSelect={v => setAnswers(a => ({ ...a, save_range: v as any }))}
            onNext={() => setTimeout(goNext, 350)}
            visible={showContent}
            chapter={chapter}
          />
        );

      case 'q14':
        return (
          <AnimatedSingleSelect
            title="How confident are you with money right now?"
            options={confidenceOptions}
            value={answers.confidence}
            onSelect={v => setAnswers(a => ({ ...a, confidence: v as any }))}
            onNext={() => setTimeout(goNext, 350)}
            visible={showContent}
            chapter={chapter}
          />
        );

      default:
        return null;
    }
  };

  const renderFinal = () => {
    return <FinalCard visible={showContent} chapter={currentChapter} answers={answers} />;
  };

  const renderStage = () => {
    if (!current) return null;
    if (current.kind === 'final') return renderFinal();
    if (current.kind !== 'question') return null;
    return renderQuestion(current.id, current.chapter);
  };

  const sheetTranslate = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [420, 0] });
  const colors = gradients.accentVibrant as unknown as readonly [string, string];

  return (
    <AnimatedBackground iconColor={colors[0]} iconOpacityScale={1.35}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.page}>
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <Pressable
            onPress={goBack}
            disabled={activeIndex === 0}
            style={({ pressed }) => [styles.navIcon, activeIndex === 0 && { opacity: 0.35 }, pressed && { opacity: 0.7 }]}
          >
            <ChevronLeft color={theme.colors.primaryText} size={22} />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <JourneyProgress currentChapter={currentChapter} totalChapters={totalChapters} progress={progressPulse} />
          </View>
          <View style={[styles.navIcon, { opacity: 0 }]} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.stageWrap}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.stageScroll}
          keyboardShouldPersistTaps="handled"
        >
          {renderStage()}
        </ScrollView>

        {/* Bottom Bar */}
        <View style={[styles.bottomBarWrap, { paddingBottom: Math.max(insets.bottom, 10) + 10 }]}>
          <GlassBox style={styles.bottomBar} noPadding intensity={55}>
            <View style={styles.bottomBarInner}>
              <View style={styles.progressText}>
                <Text style={styles.progressLabel}>Question</Text>
                <Text style={styles.progressValue}>{activeIndex + 1} of {steps.length}</Text>
              </View>

              <Pressable
                onPress={onCtaPress}
                onPressIn={onCtaPressIn}
                onPressOut={onCtaPressOut}
                disabled={!canContinue || finishing || initializing}
                style={{ flex: 1, maxWidth: 200, opacity: !canContinue || finishing || initializing ? 0.55 : 1 }}
              >
                <Animated.View style={{ transform: [{ scale: ctaScaleAnim }] }}>
                  <LinearGradient
                    colors={gradients.accentVibrant as unknown as [string, string, string]}
                    style={styles.ctaBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0.5 }}
                  >
                    <View style={styles.ctaInner}>
                      <Text style={styles.ctaText}>{initializing ? 'Loading...' : ctaLabel}</Text>
                      <ChevronRight color="#FFF" size={18} />
                    </View>
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </View>
          </GlassBox>
        </View>

        {/* Sheet */}
        {!!sheet && (
          <View style={styles.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
              <BlurView intensity={35} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlayBg }]} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{sheet.type === 'area' ? 'Area code' : 'Country / Region'}</Text>
                <Pressable onPress={closeSheet} style={styles.sheetClose}>
                  <X color={theme.colors.secondaryText} size={18} />
                </Pressable>
              </View>
              <View style={styles.sheetSearch}>
                <TextInput
                  value={sheetQuery}
                  onChangeText={setSheetQuery}
                  placeholder={sheet.type === 'area' ? 'Search codes...' : 'Search country or currency...'}
                  placeholderTextColor={theme.colors.secondaryText}
                  style={styles.sheetSearchInput}
                  selectionColor={colors[0]}
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 18 }}>
                {sheet.type === 'area'
                  ? areaOptions.map(opt => (
                      <Pressable
                        key={`${opt.country}-${opt.dial}`}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setAnswers(a => ({ ...a, phone_area_code: opt.dial }));
                          closeSheet();
                        }}
                        style={[styles.sheetRow, opt.dial === answers.phone_area_code && styles.sheetRowOn]}
                      >
                        <View style={styles.sheetRowInner}>
                          <Text style={[styles.sheetRowText, opt.dial === answers.phone_area_code && { color: colors[0] }]}>
                            {opt.label}
                          </Text>
                          {opt.dial === answers.phone_area_code && <Check color={colors[0]} size={18} />}
                        </View>
                      </Pressable>
                    ))
                  : countryOptions.map(c => {
                      const selected = c.code === answers.country_code;
                      return (
                        <Pressable
                          key={c.code}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setAnswers(a => ({ ...a, country_code: c.code, currency: c.currency }));
                            closeSheet();
                            setTimeout(goNext, 300);
                          }}
                          style={[styles.sheetRow, selected && styles.sheetRowOn]}
                        >
                          <View style={styles.sheetRowInner}>
                            <Text style={[styles.sheetRowText, selected && { color: colors[0] }]}>{c.label} · {c.currency}</Text>
                            {selected && <Check color={colors[0]} size={18} />}
                          </View>
                        </Pressable>
                      );
                    })}
              </ScrollView>
            </Animated.View>
          </View>
        )}
      </KeyboardAvoidingView>
    </AnimatedBackground>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: { flex: 1 },
  
  // Ripple
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: -25,
    marginTop: -25,
    backgroundColor: `${theme.colors.accent}30`,
  },
  
  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 14,
  },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  
  // Journey Progress
  journeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  journeyNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyNodeActive: {
    backgroundColor: theme.colors.accent,
  },
  journeyNodeCurrent: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  journeyPulse: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.accent,
  },
  journeyLineContainer: {
    width: 24,
    height: 2,
    marginHorizontal: 4,
  },
  journeyLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: theme.colors.divider,
    borderRadius: 1,
  },
  journeyLineFilled: {
    backgroundColor: theme.colors.accent,
  },
  
  // Chapter Badge
  chapterBadgeContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  chapterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 8,
  },
  chapterBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chapterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  
  // Chapter Interlude
  chapterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  chapterContent: {
    alignItems: 'center',
    padding: 32,
  },
  chapterIconContainer: {
    marginBottom: 24,
  },
  chapterIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.secondaryText,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chapterLine: {
    height: 3,
    borderRadius: 2,
    marginVertical: 16,
  },
  chapterTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.primaryText,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  chapterBody: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.secondaryText,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 290,
  },
  
  // Stage
  stageWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stageScroll: {
    paddingBottom: 140,
    paddingTop: 10,
  },
  
  // Question Card
  questionCardWrapper: {
    position: 'relative',
  },
  questionCardGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 20,
  },
  stageCard: {
    borderRadius: 22,
  },
  qTitle: {
    ...theme.typography.h2,
    fontSize: 18,
    lineHeight: 24,
  },
  qSub: {
    marginTop: 8,
    ...theme.typography.body,
    color: theme.colors.secondaryText,
  },
  
  // Select Cards
  selectCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.divider,
  },
  selectCardOn: {
    backgroundColor: `${theme.colors.accent}10`,
    borderColor: `${theme.colors.accent}45`,
  },
  selectCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectCardText: {
    color: theme.colors.primaryText,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 21,
    flex: 1,
  },
  selectCardTextOn: {
    color: theme.colors.primaryText,
  },
  checkMark: {
    marginLeft: 12,
  },
  
  // Grid
  gridWrap: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    minHeight: 68,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.divider,
  },
  gridCardOn: {
    backgroundColor: `${theme.colors.accent}12`,
    borderColor: `${theme.colors.accent}50`,
  },
  gridText: {
    color: theme.colors.primaryText,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },
  gridTextOn: {
    color: theme.colors.primaryText,
  },
  gridFooter: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridHint: {
    color: theme.colors.secondaryText,
    fontWeight: '600',
    fontSize: 13,
  },
  gridHintStrong: {
    color: theme.colors.primaryText,
    fontWeight: '700',
    fontSize: 13,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  
  // Inputs
  pillInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.divider,
    borderRadius: 14,
  },
  pillText: {
    color: theme.colors.primaryText,
    fontWeight: '700',
    fontSize: 14,
  },
  expandInput: {
    marginTop: 16,
    height: 140,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.primaryText,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 22,
  },
  
  // Meta
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: theme.colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  currencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${theme.colors.accent}15`,
    borderRadius: 10,
  },
  
  // Final
  finalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  finalIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 22,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  finalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  finalStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.secondaryText,
    marginBottom: 4,
  },
  finalStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primaryText,
    letterSpacing: -0.3,
  },
  finalStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.divider,
    marginHorizontal: 20,
  },
  finalMessage: {
    marginTop: 20,
    padding: 20,
    backgroundColor: `${theme.colors.accent}08`,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${theme.colors.accent}18`,
  },
  finalText: {
    color: theme.colors.primaryText,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  supportButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  supportLink: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  
  // Bottom Bar
  bottomBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  bottomBar: {
    borderRadius: 20,
  },
  bottomBarInner: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  progressText: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primaryText,
    marginTop: 2,
  },
  ctaBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  ctaText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  
  // Sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayBg,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  sheetTitle: {
    color: theme.colors.primaryText,
    fontWeight: '800',
    fontSize: 16,
  },
  sheetClose: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSearch: {
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  sheetSearchInput: {
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.divider,
    paddingHorizontal: 14,
    color: theme.colors.primaryText,
    fontWeight: '600',
    fontSize: 14,
  },
  sheetRow: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginHorizontal: 6,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.divider,
  },
  sheetRowOn: {
    borderColor: `${theme.colors.accent}50`,
    backgroundColor: `${theme.colors.accent}12`,
  },
  sheetRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sheetRowText: {
    color: theme.colors.primaryText,
    fontWeight: '600',
    fontSize: 14,
  },
});
