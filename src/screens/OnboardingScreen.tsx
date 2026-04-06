import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useFinancial } from '../context/FinancialContext';
import { getAdapter } from '../db';
import { GlassBox } from '../components/GlassBox';
import { COUNTRIES } from '../utils/countries';
import { CURRENCIES } from '../utils/currencies';
import { theme } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, CheckCircle2, Phone, Globe, Coins, Sparkles, X } from 'lucide-react-native';

type LifeContext =
  | 'Student'
  | 'Recently Graduated'
  | 'Working Full-Time'
  | 'Looking for Work'
  | 'Self-Employed'
  | 'Other';

type Focus =
  | 'Saving Money'
  | 'Getting out of debt'
  | 'Managing day-to-day spending'
  | 'Building better habits'
  | 'Just trying to feel more in control';

type Tracking =
  | "I don't track it"
  | 'I check my bank occasionally'
  | 'I use notes/spreadsheets'
  | 'I use an app';

type Frequency = 'Daily' | 'Once a week' | 'Rarely';

type Friction =
  | "I don't know where my money goes"
  | 'I overspend without realising'
  | 'I struggle to save'
  | 'I avoid looking at my finances'
  | 'It feels overwhelming'
  | "I start but don't stay consistent"
  | "I don't know";

type Feeling = 'In Control' | 'Okay, but could be better' | 'Stressed' | 'Avoidant' | 'Confused' | "I don't know";

type Insight =
  | '“I want to be better with money but don’t know where to start”'
  | '“I start tracking but fall off after a few days”'
  | '“I know what to do, I just don’t do it consistently”'
  | '“I’m already decent, just want to improve”'
  | "I don't know";

type Success =
  | 'I saved some money'
  | 'I tracked consistently'
  | 'I feel more in control'
  | 'I reduced unnecessary spending'
  | 'I built a routine';

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

const lifeOptions: LifeContext[] = [
  'Student',
  'Recently Graduated',
  'Working Full-Time',
  'Looking for Work',
  'Self-Employed',
  'Other',
];

const focusOptions: Focus[] = [
  'Saving Money',
  'Getting out of debt',
  'Managing day-to-day spending',
  'Building better habits',
  'Just trying to feel more in control',
];

const trackingOptions: Tracking[] = [
  "I don't track it",
  'I check my bank occasionally',
  'I use notes/spreadsheets',
  'I use an app',
];

const frequencyOptions: Frequency[] = ['Daily', 'Once a week', 'Rarely'];

const frictionOptions: Friction[] = [
  "I don't know where my money goes",
  'I overspend without realising',
  'I struggle to save',
  'I avoid looking at my finances',
  'It feels overwhelming',
  "I start but don't stay consistent",
  "I don't know",
];

const feelingOptions: Feeling[] = ['In Control', 'Okay, but could be better', 'Stressed', 'Avoidant', 'Confused', "I don't know"];

const insightOptions: Insight[] = [
  '“I want to be better with money but don’t know where to start”',
  '“I start tracking but fall off after a few days”',
  '“I know what to do, I just don’t do it consistently”',
  '“I’m already decent, just want to improve”',
  "I don't know",
];

const successOptions: Success[] = [
  'I saved some money',
  'I tracked consistently',
  'I feel more in control',
  'I reduced unnecessary spending',
  'I built a routine',
];

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

const areaCodes = ['+1', '+44', '+27', '+61', '+234', '+254', '+971'];

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  AU: 'AUD',
  NZ: 'NZD',
  JP: 'JPY',
};

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const OnboardingScreen: React.FC<{ onFinished: () => void }> = ({ onFinished }) => {
  const { user: authUser } = useAuth();
  const { updateUser } = useFinancial();
  const userId = authUser?.id || 'local';

  const storageKey = useMemo(() => `@monara:onboarding:${userId}`, [userId]);

  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers());
  const [picker, setPicker] = useState<{ title: string; options: string[]; value: string; onPick: (v: string) => void } | null>(null);
  const [loadingDone, setLoadingDone] = useState(false);

  const totalSteps = 8;

  const progressPct = ((step + 1) / totalSteps) * 100;

  const stepAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(progressPct)).current;
  const ctaGlowAnim = useRef(new Animated.Value(0)).current;
  const ctaScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: progressPct, duration: 260, useNativeDriver: false }).start();
  }, [step, progressPct, stepAnim, progressAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaGlowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(ctaGlowAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ctaGlowAnim]);

  const onCtaPressIn = () => {
    Haptics.selectionAsync();
    Animated.spring(ctaScaleAnim, { toValue: 0.98, useNativeDriver: true, tension: 180, friction: 18 }).start();
  };

  const onCtaPressOut = () => {
    Animated.spring(ctaScaleAnim, { toValue: 1, useNativeDriver: true, tension: 180, friction: 18 }).start();
  };

  const next = () => {
    Haptics.selectionAsync();
    setStep(s => (Math.min((s + 1) as Step, 7) as Step));
  };

  const back = () => {
    Haptics.selectionAsync();
    setStep(s => (Math.max((s - 1) as Step, 0) as Step));
  };

  const toggleFriction = (v: Friction) => {
    Haptics.selectionAsync();
    setAnswers(a => {
      const exists = a.friction.includes(v);
      if (exists) return { ...a, friction: a.friction.filter(x => x !== v) };
      if (a.friction.length >= 2) return a;
      return { ...a, friction: [...a.friction, v] };
    });
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
    await updateUser({ country_code: answers.country_code, currency: answers.currency });
    setLoadingDone(true);
    onFinished();
  };

  const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <GlassBox style={styles.card}>
      {children}
    </GlassBox>
  );

  const Choice = ({ label, value, onPress, selected }: { label: string; value: string; onPress: () => void; selected: boolean }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.choice, selected && styles.choiceOn]}>
      <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ImageBackground
      source={require('../../assets/monara-splash.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.page}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={back}
            style={[styles.navIcon, step === 0 && { opacity: 0.25 }]}
            disabled={step === 0}
            activeOpacity={0.8}
          >
            <ChevronLeft color={theme.colors.primaryText} size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: 10 }}>
            <Text style={styles.topTitle}>Welcome to Monara</Text>
            <Text style={styles.topSub}>A few quick questions to tailor your experience</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={{
              opacity: stepAnim,
              transform: [
                {
                  translateX: stepAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [22, 0],
                  }),
                },
              ],
            }}
          >
          {step === 0 && (
            <Card>
              <View style={styles.sectionHeader}>
                <Sparkles color={theme.colors.accent} size={18} />
                <Text style={styles.sectionTitle}>Section 1 · General Information</Text>
              </View>

              <Text style={styles.label}>1. Mobile Number</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.input, styles.areaCode]}
                  activeOpacity={0.85}
                  onPress={() =>
                    setPicker({
                      title: 'Area code',
                      options: areaCodes,
                      value: answers.phone_area_code,
                      onPick: v => setAnswers(a => ({ ...a, phone_area_code: v })),
                    })
                  }
                >
                  <Phone color={theme.colors.accent} size={16} />
                  <Text style={styles.areaCodeText}>{answers.phone_area_code}</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={answers.phone_number}
                  onChangeText={v => setAnswers(a => ({ ...a, phone_number: v }))}
                  placeholder="Number"
                  placeholderTextColor={theme.colors.secondaryText}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.label}>2. Country / Region</Text>
              <TouchableOpacity
                style={styles.input}
                activeOpacity={0.85}
                onPress={() =>
                  setPicker({
                    title: 'Country / Region',
                    options: COUNTRIES.map(c => {
                      const currency = COUNTRY_CURRENCY[c.code] || 'USD';
                      return `${c.flag} ${c.name} (${c.code}) · ${currency}`;
                    }),
                    value: answers.country_code,
                    onPick: v => {
                      const code = v.match(/\(([A-Z]{2})\)$/)?.[1] || 'US';
                      const currency = COUNTRY_CURRENCY[code] || 'USD';
                      setAnswers(a => ({ ...a, country_code: code, currency }));
                    },
                  })
                }
              >
                <Globe color={theme.colors.accent} size={16} />
                <Text style={styles.inputText}>
                  {(COUNTRIES.find(c => c.code === answers.country_code)?.name || 'United States') + ` (${answers.country_code})`}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>3. Currency</Text>
              <View style={[styles.input, { justifyContent: 'space-between' }]}>
                <Coins color={theme.colors.accent} size={16} />
                <Text style={styles.inputText}>
                  {answers.currency} · {(CURRENCIES.find(c => c.code === answers.currency)?.name || 'US Dollar')}
                </Text>
              </View>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <View style={styles.sectionHeader}>
                <Sparkles color={theme.colors.accent} size={18} />
                <Text style={styles.sectionTitle}>Section 2 · Life Context</Text>
              </View>

              <Text style={styles.label}>4. Which best describes you right now?</Text>
              <View style={styles.choices}>
                {lifeOptions.map(o => (
                  <Choice key={o} label={o} value={o} selected={answers.life_context === o} onPress={() => setAnswers(a => ({ ...a, life_context: o }))} />
                ))}
              </View>

              <Text style={styles.label}>5. What&apos;s your main financial focus right now?</Text>
              <View style={styles.choices}>
                {focusOptions.map(o => (
                  <Choice key={o} label={o} value={o} selected={answers.main_focus === o} onPress={() => setAnswers(a => ({ ...a, main_focus: o }))} />
                ))}
              </View>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <View style={styles.sectionHeader}>
                <Sparkles color={theme.colors.accent} size={18} />
                <Text style={styles.sectionTitle}>Section 3 · Current Habits</Text>
              </View>

              <Text style={styles.label}>6. How do you currently track your money?</Text>
              <View style={styles.choices}>
                {trackingOptions.map(o => (
                  <Choice key={o} label={o} value={o} selected={answers.tracking_method === o} onPress={() => setAnswers(a => ({ ...a, tracking_method: o }))} />
                ))}
              </View>
              {answers.tracking_method === 'I use an app' && (
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  value={answers.tracking_app_name}
                  onChangeText={v => setAnswers(a => ({ ...a, tracking_app_name: v }))}
                  placeholder="App name"
                  placeholderTextColor={theme.colors.secondaryText}
                />
              )}

              <Text style={styles.label}>7. How often do you check your finances?</Text>
              <View style={styles.choices}>
                {frequencyOptions.map(o => (
                  <Choice key={o} label={o} value={o} selected={answers.check_frequency === o} onPress={() => setAnswers(a => ({ ...a, check_frequency: o }))} />
                ))}
              </View>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <View style={styles.sectionHeader}>
                <Sparkles color={theme.colors.accent} size={18} />
                <Text style={styles.sectionTitle}>Section 4 · Pain & Friction</Text>
              </View>

              <Text style={styles.label}>8. What feels hardest about managing your money? (Pick up to 2)</Text>
              <View style={styles.choices}>
                {frictionOptions.map(o => {
                  const selected = answers.friction.includes(o);
                  const disabled = !selected && answers.friction.length >= 2;
                  return (
                    <TouchableOpacity
                      key={o}
                      activeOpacity={0.85}
                      style={[styles.choice, selected && styles.choiceOn, disabled && { opacity: 0.35 }]}
                      onPress={() => toggleFriction(o)}
                      disabled={disabled}
                    >
                      <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>{o}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.helper, { marginTop: 8 }]}>
                Selected: {answers.friction.length}/2
              </Text>

              <Text style={styles.label}>9. When it comes to money, how do you feel most of the time?</Text>
              <View style={styles.choices}>
                {feelingOptions.map(o => (
                  <Choice key={o} label={o} value={o} selected={answers.feeling === o} onPress={() => setAnswers(a => ({ ...a, feeling: o }))} />
                ))}
              </View>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <View style={styles.sectionHeader}>
                <Sparkles color={theme.colors.accent} size={18} />
                <Text style={styles.sectionTitle}>Section 5 · Behaviour Insight</Text>
              </View>

              <Text style={styles.label}>10. Which sounds most like you?</Text>
              <View style={styles.choices}>
                {insightOptions.map(o => (
                  <Choice key={o} label={o} value={o} selected={answers.behaviour_insight === o} onPress={() => setAnswers(a => ({ ...a, behaviour_insight: o }))} />
                ))}
              </View>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <View style={styles.sectionHeader}>
                <Sparkles color={theme.colors.accent} size={18} />
                <Text style={styles.sectionTitle}>Section 6 · Goal Setting</Text>
              </View>

              <Text style={styles.label}>11. If you could fix ONE thing about your money in the next 30 days, what would it be?</Text>
              <TextInput
                style={[styles.input, { minHeight: 92, textAlignVertical: 'top', paddingTop: 12 }]}
                multiline
                value={answers.fix_one_thing}
                onChangeText={v => setAnswers(a => ({ ...a, fix_one_thing: v }))}
                placeholder="Write your answer..."
                placeholderTextColor={theme.colors.secondaryText}
              />

              <Text style={styles.label}>12. What would success look like for you in 30 days?</Text>
              <View style={styles.choices}>
                {successOptions.map(o => (
                  <Choice key={o} label={o} value={o} selected={answers.success_30_days === o} onPress={() => setAnswers(a => ({ ...a, success_30_days: o }))} />
                ))}
              </View>
            </Card>
          )}

          {step === 6 && (
            <Card>
              <View style={styles.sectionHeader}>
                <Sparkles color={theme.colors.accent} size={18} />
                <Text style={styles.sectionTitle}>Section 7 · Baseline</Text>
              </View>

              <Text style={styles.label}>13. Roughly how much do you save each month?</Text>
              <View style={styles.choices}>
                {saveRangeOptions.map(o => (
                  <Choice key={o} label={o} value={o} selected={answers.save_range === o} onPress={() => setAnswers(a => ({ ...a, save_range: o }))} />
                ))}
              </View>

              <Text style={styles.label}>14. How confident are you with money right now?</Text>
              <View style={styles.choices}>
                {confidenceOptions.map(o => (
                  <Choice key={o} label={o} value={o} selected={answers.confidence === o} onPress={() => setAnswers(a => ({ ...a, confidence: o }))} />
                ))}
              </View>
            </Card>
          )}

          {step === 7 && (
            <View style={styles.finalCard}>
              <View style={styles.finalIcon}>
                <CheckCircle2 color="#FFF" size={34} />
              </View>
              <Text style={styles.finalTitle}>You&apos;re in.</Text>
              <Text style={styles.finalText}>
                We look forward to you being our early access members, please use the app and we look forward to hearing from you in 30 days!
              </Text>
              <Text style={styles.finalText}>
                For any questions or support contact info@monaramoney.com
              </Text>
              <Pressable
                onPress={finish}
                onPressIn={onCtaPressIn}
                onPressOut={onCtaPressOut}
                style={{ marginTop: 14, width: '100%' }}
              >
                <Animated.View style={{ transform: [{ scale: ctaScaleAnim }] }}>
                  <View style={styles.finalCta}>
                    <LinearGradient colors={[theme.colors.accent, '#2B7AB5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <Animated.View style={[StyleSheet.absoluteFill, { opacity: ctaGlowAnim }]}>
                      <LinearGradient colors={['#1B2A4A', theme.colors.accent]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                    <View style={styles.ctaInner}>
                      <Text style={styles.finalCtaText}>{loadingDone ? 'Ready' : 'Start using Monara'}</Text>
                      <ChevronRight color="#FFF" size={18} />
                    </View>
                  </View>
                </Animated.View>
              </Pressable>
            </View>
          )}
          </Animated.View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepLabel}>Step {step + 1} of {totalSteps}</Text>
          </View>
          {step < 7 ? (
            <Pressable onPress={next} onPressIn={onCtaPressIn} onPressOut={onCtaPressOut} style={{ width: 160 }}>
              <Animated.View style={{ transform: [{ scale: ctaScaleAnim }] }}>
                <View style={styles.nextBtn}>
                  <LinearGradient colors={[theme.colors.accent, '#2B7AB5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <Animated.View style={[StyleSheet.absoluteFill, { opacity: ctaGlowAnim }]}>
                    <LinearGradient colors={['#1B2A4A', theme.colors.accent]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
                  </Animated.View>
                  <View style={styles.ctaInner}>
                    <Text style={styles.nextBtnText}>Continue</Text>
                    <ChevronRight color="#FFF" size={18} />
                  </View>
                </View>
              </Animated.View>
            </Pressable>
          ) : (
            <View style={{ width: 160 }} />
          )}
        </View>

      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setPicker(null)}>
          <Pressable onPress={() => {}} style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{picker?.title}</Text>
              <TouchableOpacity onPress={() => setPicker(null)} style={styles.pickerClose}>
                <X color={theme.colors.secondaryText} size={18} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {picker?.options.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={styles.pickerRow}
                  onPress={() => {
                    Haptics.selectionAsync();
                    picker.onPick(opt);
                    setPicker(null);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.pickerRowText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  navIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,42,74,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  topTitle: {
    color: theme.colors.primaryText,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  topSub: {
    marginTop: 2,
    color: theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    marginHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27,42,74,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 18,
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: theme.colors.primaryText,
    fontSize: 13,
    fontWeight: '900',
  },
  label: {
    marginTop: 14,
    marginBottom: 8,
    color: theme.colors.primaryText,
    fontSize: 13,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 14,
    color: theme.colors.primaryText,
    fontWeight: '700',
    fontSize: 14,
  },
  inputText: {
    color: theme.colors.primaryText,
    fontWeight: '800',
    fontSize: 14,
  },
  areaCode: {
    width: 92,
    justifyContent: 'center',
  },
  areaCodeText: {
    color: theme.colors.primaryText,
    fontWeight: '900',
  },
  choices: {
    gap: 10,
  },
  choice: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  choiceOn: {
    backgroundColor: 'rgba(62,146,204,0.12)',
    borderColor: 'rgba(62,146,204,0.25)',
  },
  choiceText: {
    color: theme.colors.primaryText,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
  },
  choiceTextOn: {
    color: theme.colors.accent,
  },
  helper: {
    color: theme.colors.secondaryText,
    fontWeight: '700',
    fontSize: 12,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  stepLabel: {
    color: theme.colors.secondaryText,
    fontWeight: '800',
    fontSize: 12,
  },
  nextBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  nextBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  finalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  finalIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    marginBottom: 12,
  },
  finalTitle: {
    color: theme.colors.primaryText,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  finalText: {
    marginTop: 10,
    color: theme.colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  finalCta: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  finalCtaText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayBg,
    justifyContent: 'center',
    padding: 16,
  },
  pickerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  pickerTitle: {
    color: theme.colors.primaryText,
    fontWeight: '900',
    fontSize: 14,
  },
  pickerClose: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerRow: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 14,
  },
  pickerRowText: {
    color: theme.colors.primaryText,
    fontWeight: '800',
  },
});
