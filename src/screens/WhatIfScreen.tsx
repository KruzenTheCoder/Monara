import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Rect, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { formatCurrencyFull, theme } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Calculator,
  Percent,
  Minus,
  Plus,
  BarChart2,
  Target,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Scenario {
  id: string;
  label: string;
  icon: any;
  color: string;
  description: string;
  adjustmentKey: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: 'currency' | 'percent';
}

export const WhatIfScreen = () => {
  const navigation = useNavigation();
  const {
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    balance,
    monthlySpendingByCategory,
    user,
  } = useFinancial();

  const isLight = theme.name === 'monara';
  const currency = user.currency || 'USD';

  // Scenario adjustments
  const [adjustments, setAdjustments] = useState<Record<string, number>>({
    income_change: 0,
    expense_cut: 0,
    dining_cut: 0,
    shopping_cut: 0,
    extra_savings: 0,
    investment_return: 7,
  });

  const scenarios: Scenario[] = useMemo(() => [
    {
      id: 'income',
      label: 'Income Increase',
      icon: TrendingUp,
      color: '#10B981',
      description: 'What if you earned more each month?',
      adjustmentKey: 'income_change',
      defaultValue: 0,
      min: 0,
      max: Math.round(monthlyIncome * 2),
      step: Math.max(50, Math.round(monthlyIncome * 0.05)),
      unit: 'currency',
    },
    {
      id: 'expense_cut',
      label: 'Overall Expense Cut',
      icon: Minus,
      color: '#EF4444',
      description: 'What if you reduced total expenses?',
      adjustmentKey: 'expense_cut',
      defaultValue: 0,
      min: 0,
      max: 50,
      step: 5,
      unit: 'percent',
    },
    {
      id: 'dining',
      label: 'Cut Dining Spend',
      icon: DollarSign,
      color: '#F59E0B',
      description: 'What if you spent less on food & dining?',
      adjustmentKey: 'dining_cut',
      defaultValue: 0,
      min: 0,
      max: 100,
      step: 10,
      unit: 'percent',
    },
    {
      id: 'shopping',
      label: 'Cut Shopping',
      icon: Target,
      color: '#EC4899',
      description: 'What if you reduced shopping expenses?',
      adjustmentKey: 'shopping_cut',
      defaultValue: 0,
      min: 0,
      max: 100,
      step: 10,
      unit: 'percent',
    },
    {
      id: 'savings',
      label: 'Extra Monthly Savings',
      icon: PiggyBank,
      color: '#3B82F6',
      description: 'What if you saved a fixed extra amount?',
      adjustmentKey: 'extra_savings',
      defaultValue: 0,
      min: 0,
      max: Math.round(monthlyIncome),
      step: Math.max(25, Math.round(monthlyIncome * 0.02)),
      unit: 'currency',
    },
    {
      id: 'invest',
      label: 'Investment Return Rate',
      icon: BarChart2,
      color: '#3E92CC',
      description: 'Annual rate of return on invested savings',
      adjustmentKey: 'investment_return',
      defaultValue: 7,
      min: 0,
      max: 15,
      step: 1,
      unit: 'percent',
    },
  ], [monthlyIncome, currency]);

  // Calculate projected figures
  const projectedFigures = useMemo(() => {
    const newIncome = monthlyIncome + adjustments.income_change;
    const expenseCutMultiplier = 1 - (adjustments.expense_cut / 100);

    const diningSpend = monthlySpendingByCategory['Food & Dining'] || 0;
    const shoppingSpend = monthlySpendingByCategory['Shopping'] || 0;
    const otherExpenses = monthlyExpenses - diningSpend - shoppingSpend;

    const newDining = diningSpend * (1 - adjustments.dining_cut / 100);
    const newShopping = shoppingSpend * (1 - adjustments.shopping_cut / 100);
    const newExpenses = (otherExpenses + newDining + newShopping) * expenseCutMultiplier;

    const monthlySaving = newIncome - newExpenses + adjustments.extra_savings;
    const newSavingsRate = newIncome > 0 ? (monthlySaving / newIncome) * 100 : 0;

    // Compound growth projections
    const annualRate = adjustments.investment_return / 100;
    const monthlyRate = annualRate / 12;

    const proj1 = Array.from({ length: 12 }).reduce<number>(
      (bal, _, i) => (bal + monthlySaving) * (1 + monthlyRate), balance
    );
    const proj5 = Array.from({ length: 60 }).reduce<number>(
      (bal, _, i) => (bal + monthlySaving) * (1 + monthlyRate), balance
    );
    const proj10 = Array.from({ length: 120 }).reduce<number>(
      (bal, _, i) => (bal + monthlySaving) * (1 + monthlyRate), balance
    );

    // Timeline for chart (Base vs Simulated)
    const baseSaving = monthlyIncome - monthlyExpenses;
    const chartData = Array.from({ length: 12 }).map((_, year) => {
      const months = (year + 1) * 12;
      const baseVal = Array.from({ length: months }).reduce<number>((b) => (b + baseSaving) * (1 + monthlyRate), balance);
      const simVal = Array.from({ length: months }).reduce<number>((b) => (b + monthlySaving) * (1 + monthlyRate), balance);
      return { year: year + 1, base: baseVal, sim: simVal };
    });

    return {
      newIncome,
      newExpenses: Math.max(newExpenses, 0),
      monthlySaving,
      newSavingsRate: Math.max(newSavingsRate, 0),
      savedDining: diningSpend - newDining,
      savedShopping: shoppingSpend - newShopping,
      totalMonthly: monthlySaving - (monthlyIncome - monthlyExpenses),
      proj1Year: proj1 as number,
      proj5Year: proj5 as number,
      proj10Year: proj10 as number,
      chartData,
    };
  }, [adjustments, monthlyIncome, monthlyExpenses, balance, monthlySpendingByCategory]);

  const adjustValue = (key: string, delta: number, scenario: Scenario) => {
    Haptics.selectionAsync();
    setAdjustments(prev => ({
      ...prev,
      [key]: Math.max(scenario.min, Math.min(scenario.max, (prev[key] || scenario.defaultValue) + delta)),
    }));
  };

  const resetAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAdjustments({
      income_change: 0,
      expense_cut: 0,
      dining_cut: 0,
      shopping_cut: 0,
      extra_savings: 0,
      investment_return: 7,
    });
  };

  const Chart = () => {
    const data = projectedFigures.chartData;
    const maxVal = Math.max(...data.map(d => Math.max(d.base, d.sim)), 100);
    const height = 120;
    const width = SCREEN_WIDTH - 80;
    
    // Generate paths
    const getX = (index: number) => (index / (data.length - 1)) * width;
    const getY = (val: number) => height - (val / maxVal) * height;

    const simPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.sim)}`).join(' ');
    const basePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.base)}`).join(' ');

    const fillPath = `${simPath} L ${width} ${height} L 0 ${height} Z`;

    return (
      <View style={{ marginTop: 24, alignItems: 'center', width: '100%', height: height + 20 }}>
        <Svg width={width} height={height} style={{ overflow: 'visible' }}>
          <Defs>
            <SvgGradient id="simFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.colors.accent} stopOpacity={isLight ? 0.2 : 0.3} />
              <Stop offset="1" stopColor={theme.colors.accent} stopOpacity="0" />
            </SvgGradient>
          </Defs>
          {/* Base Trajectory */}
          <Path d={basePath} stroke={isLight ? "rgba(0,0,0,0.1)" : "rgba(27,42,74,0.15)"} strokeWidth="2" strokeDasharray="4,4" fill="none" />
          
          {/* Simulated Trajectory fill */}
          <Path d={fillPath} fill="url(#simFill)" />
          
          {/* Simulated Trajectory */}
          <Path d={simPath} stroke={theme.colors.accent} strokeWidth="3" fill="none" />
          
          {/* Points */}
          {data.map((d, i) => {
            if (i === 0 || i === data.length - 1 || i % 3 === 2) {
              return (
                <Circle key={`p-${i}`} cx={getX(i)} cy={getY(d.sim)} r="4" fill={theme.colors.accent} stroke={isLight ? "#FFF" : "#FAFAFC"} strokeWidth="2" />
              );
            }
            return null;
          })}
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width, marginTop: 8 }}>
          <Text style={styles.chartLabel}>1Y</Text>
          <Text style={styles.chartLabel}>4Y</Text>
          <Text style={styles.chartLabel}>8Y</Text>
          <Text style={styles.chartLabel}>12Y</Text>
        </View>
      </View>
    );
  };

  const ScenarioCard = ({ scenario }: { scenario: Scenario }) => {
    const value = adjustments[scenario.adjustmentKey] ?? scenario.defaultValue;
    const isModified = value !== scenario.defaultValue;

    return (
      <GlassBox style={[styles.scenarioCard, isModified && { borderColor: `${scenario.color}40` }]}>
        <View style={styles.scenarioHeader}>
          <View style={[styles.scenarioIcon, { backgroundColor: `${scenario.color}20` }]}>
            <scenario.icon color={scenario.color} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.scenarioLabel, { color: theme.colors.primaryText }]}>{scenario.label}</Text>
            <Text style={[styles.scenarioDesc, { color: theme.colors.secondaryText }]}>{scenario.description}</Text>
          </View>
        </View>

        <View style={styles.adjustRow}>
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => adjustValue(scenario.adjustmentKey, -scenario.step, scenario)}
          >
            <Minus color={theme.colors.primaryText} size={18} />
          </TouchableOpacity>

          <View style={styles.valueDisplay}>
            <Text style={[styles.valueText, { color: theme.colors.primaryText }, isModified && { color: scenario.color }]}>
              {scenario.unit === 'currency'
                ? formatCurrencyFull(value, currency)
                : `${value}%`
              }
            </Text>
          </View>

          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => adjustValue(scenario.adjustmentKey, scenario.step, scenario)}
          >
            <Plus color={theme.colors.primaryText} size={18} />
          </TouchableOpacity>
        </View>
      </GlassBox>
    );
  };

  const savingsDifference = projectedFigures.monthlySaving - (monthlyIncome - monthlyExpenses);
  const isPositive = savingsDifference >= 0;

  return (
    <AnimatedBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={theme.colors.primaryText} size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.primaryText }]}>What-If Scenarios</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.secondaryText }]}>Simulate financial changes</Text>
          </View>
          <TouchableOpacity onPress={resetAll} style={styles.resetBtn}>
            <Text style={[styles.resetText, { color: theme.colors.accent }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Projection Summary */}
        <GlassBox style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: theme.colors.secondaryText }]}>Projected Monthly Savings</Text>
          <Text style={[
            styles.summaryAmount,
            { color: projectedFigures.monthlySaving >= 0 ? theme.colors.status.green : theme.colors.status.red },
          ]}>
            {formatCurrencyFull(projectedFigures.monthlySaving, currency)}
          </Text>
          <View style={styles.summaryChange}>
            {isPositive ? <TrendingUp color={theme.colors.status.green} size={14} /> : <TrendingDown color={theme.colors.status.red} size={14} />}
            <Text style={[styles.changeText, { color: isPositive ? theme.colors.status.green : theme.colors.status.red }]}>
              {isPositive ? '+' : ''}{formatCurrencyFull(savingsDifference, currency)}/mo vs current
            </Text>
          </View>
 
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.glassBorder }]} />
 
          <Chart />
 
          <View style={[styles.summaryDivider, { marginTop: 20, backgroundColor: theme.colors.glassBorder }]} />
 
          <View style={styles.projRow}>
            <View style={styles.projItem}>
              <Text style={[styles.projLabel, { color: theme.colors.secondaryText }]}>Savings Rate</Text>
              <Text style={[styles.projValue, { color: theme.colors.primaryText }]}>{projectedFigures.newSavingsRate.toFixed(0)}%</Text>
            </View>
            <View style={[styles.projDivider, { backgroundColor: theme.colors.glassBorder }]} />
            <View style={styles.projItem}>
              <Text style={[styles.projLabel, { color: theme.colors.secondaryText }]}>5 Years</Text>
              <Text style={[styles.projValue, { color: theme.colors.primaryText }]}>{formatCurrencyFull(projectedFigures.proj5Year, currency)}</Text>
            </View>
          </View>
 
          <View style={[styles.proj10Row, { borderTopColor: theme.colors.glassBorder }]}>
            <Text style={[styles.proj10Label, { color: theme.colors.secondaryText }]}>10 Year Projection</Text>
            <Text style={[styles.proj10Value, { color: theme.colors.accent }]}>{formatCurrencyFull(projectedFigures.proj10Year, currency)}</Text>
          </View>
        </GlassBox>

        {/* Scenario Controls */}
        <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>Adjust Your Scenarios</Text>
        {scenarios.map(s => (
          <ScenarioCard key={s.id} scenario={s} />
        ))}
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 60, paddingBottom: 140 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(27,42,74,0.05)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  resetBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(27,42,74,0.05)',
  },
  resetText: { fontSize: 13, fontWeight: '600' },
  summaryCard: { padding: 24, alignItems: 'center', marginBottom: 24 },
  summaryTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmount: { fontSize: 40, fontWeight: '800', letterSpacing: -1, marginBottom: 8 },
  summaryChange: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  changeText: { fontSize: 13, fontWeight: '600' },
  chartLabel: { fontSize: 10, color: theme.colors.secondaryText, fontWeight: '600' },
  summaryDivider: { width: '100%', height: 1, marginBottom: 16 },
  projRow: { flexDirection: 'row', width: '100%' },
  projItem: { flex: 1, alignItems: 'center' },
  projLabel: { fontSize: 11, marginBottom: 4, fontWeight: '600' },
  projValue: { fontSize: 15, fontWeight: '700' },
  projDivider: { width: 1, alignSelf: 'stretch' },
  proj10Row: {
    width: '100%', marginTop: 16, paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  proj10Label: { fontSize: 14, fontWeight: '600' },
  proj10Value: { fontSize: 18, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  scenarioCard: { marginBottom: 12, padding: 16, borderWidth: 1, borderColor: 'transparent' },
  scenarioHeader: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  scenarioIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  scenarioLabel: { fontSize: 15, fontWeight: '600' },
  scenarioDesc: { fontSize: 12, marginTop: 2 },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adjustBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)', justifyContent: 'center', alignItems: 'center',
  },
  valueDisplay: {
    flex: 1, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  valueText: { fontSize: 18, fontWeight: '700' },
});
