import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Rect, Defs, LinearGradient as SvgGradient, Stop, G, Text as SvgText } from 'react-native-svg';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  PieChart,
  X,
  Briefcase,
  Building2,
  Gem,
  Coins,
  Globe,
  Landmark,
  Wallet,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Asset {
  id: string;
  name: string;
  type: 'stocks' | 'bonds' | 'crypto' | 'real_estate' | 'cash' | 'etf' | 'commodities';
  currentValue: number;
  investedAmount: number;
  color: string;
}

const ASSET_TYPES = [
  { id: 'stocks', label: 'Stocks', icon: TrendingUp, color: '#3B82F6' },
  { id: 'bonds', label: 'Bonds', icon: Landmark, color: '#10B981' },
  { id: 'crypto', label: 'Crypto', icon: Coins, color: '#F59E0B' },
  { id: 'real_estate', label: 'Real Estate', icon: Building2, color: '#3E92CC' },
  { id: 'cash', label: 'Cash/Savings', icon: Wallet, color: '#6B7280' },
  { id: 'etf', label: 'ETF/Index', icon: BarChart2, color: '#EC4899' },
  { id: 'commodities', label: 'Commodities', icon: Gem, color: '#EF4444' },
];

export const InvestmentTrackerScreen = () => {
  const navigation = useNavigation();
  const { user } = useFinancial();
  const currency = user.currency || 'USD';

  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', name: 'S&P 500 Index', type: 'etf', currentValue: 15200, investedAmount: 12000, color: '#EC4899' },
    { id: '2', name: 'Tech Stocks', type: 'stocks', currentValue: 8400, investedAmount: 7000, color: '#3B82F6' },
    { id: '3', name: 'Bitcoin', type: 'crypto', currentValue: 3100, investedAmount: 2500, color: '#F59E0B' },
    { id: '4', name: 'Government Bonds', type: 'bonds', currentValue: 5050, investedAmount: 5000, color: '#10B981' },
    { id: '5', name: 'Savings Account', type: 'cash', currentValue: 4000, investedAmount: 4000, color: '#6B7280' },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '', type: 'stocks', currentValue: '', investedAmount: '',
  });

  // Portfolio calculations
  const portfolio = useMemo(() => {
    const totalValue = assets.reduce((s, a) => s + a.currentValue, 0);
    const totalInvested = assets.reduce((s, a) => s + a.investedAmount, 0);
    const totalGainLoss = totalValue - totalInvested;
    const totalReturnPct = totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100) : 0;

    // Allocation by type
    const allocationMap = new Map<string, { value: number; type: string; color: string }>();
    assets.forEach(a => {
      const existing = allocationMap.get(a.type);
      const typeInfo = ASSET_TYPES.find(t => t.id === a.type)!;
      if (existing) {
        existing.value += a.currentValue;
      } else {
        allocationMap.set(a.type, { value: a.currentValue, type: a.type, color: typeInfo.color });
      }
    });

    const allocation = Array.from(allocationMap.values())
      .sort((a, b) => b.value - a.value)
      .map(item => ({
        ...item,
        percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
      }));

    // Top/worst performers
    const performers = [...assets]
      .map(a => ({
        ...a,
        gainLoss: a.currentValue - a.investedAmount,
        returnPct: a.investedAmount > 0 ? ((a.currentValue - a.investedAmount) / a.investedAmount) * 100 : 0,
      }))
      .sort((a, b) => b.returnPct - a.returnPct);

    return { totalValue, totalInvested, totalGainLoss, totalReturnPct, allocation, performers };
  }, [assets]);

  const addAsset = () => {
    if (!newAsset.name || !newAsset.currentValue || !newAsset.investedAmount) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const typeInfo = ASSET_TYPES.find(t => t.id === newAsset.type)!;
    setAssets(prev => [...prev, {
      id: Date.now().toString(),
      name: newAsset.name,
      type: newAsset.type as any,
      currentValue: parseFloat(newAsset.currentValue),
      investedAmount: parseFloat(newAsset.investedAmount),
      color: typeInfo.color,
    }]);
    setNewAsset({ name: '', type: 'stocks', currentValue: '', investedAmount: '' });
    setShowAddModal(false);
  };

  const removeAsset = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const isPositive = portfolio.totalGainLoss >= 0;

  // Simple donut chart
  const DonutChart = () => {
    const size = 180;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    let currentOffset = 0;

    return (
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="rgba(27,42,74,0.06)" strokeWidth={strokeWidth} fill="none"
          />
          {portfolio.allocation.map((item, i) => {
            const segmentLength = (item.percentage / 100) * circumference;
            const offset = circumference - currentOffset;
            currentOffset += segmentLength;

            return (
              <Circle
                key={i}
                cx={size / 2} cy={size / 2} r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutValue}>{formatCurrencyFull(portfolio.totalValue, currency)}</Text>
          <Text style={styles.donutLabel}>Total Value</Text>
        </View>
      </View>
    );
  };

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
            <Text style={styles.headerTitle}>Investments</Text>
            <Text style={styles.headerSubtitle}>Track your portfolio performance</Text>
          </View>
        </View>

        {/* Portfolio Overview */}
        <GlassBox style={styles.overviewCard}>
          <DonutChart />

          <View style={styles.gainRow}>
            <View style={[styles.gainBadge, { backgroundColor: isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
              {isPositive ? <TrendingUp color={theme.colors.status.green} size={16} /> : <TrendingDown color={theme.colors.status.red} size={16} />}
              <Text style={[styles.gainText, { color: isPositive ? theme.colors.status.green : theme.colors.status.red }]}>
                {isPositive ? '+' : ''}{formatCurrencyFull(portfolio.totalGainLoss, currency)} ({portfolio.totalReturnPct.toFixed(1)}%)
              </Text>
            </View>
          </View>

          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Invested</Text>
              <Text style={styles.overviewValue}>{formatCurrencyFull(portfolio.totalInvested, currency)}</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Current Value</Text>
              <Text style={styles.overviewValue}>{formatCurrencyFull(portfolio.totalValue, currency)}</Text>
            </View>
          </View>
        </GlassBox>

        {/* Allocation */}
        <Text style={styles.sectionTitle}>Asset Allocation</Text>
        <GlassBox style={styles.allocationCard}>
          {portfolio.allocation.map((item, i) => {
            const typeInfo = ASSET_TYPES.find(t => t.id === item.type)!;
            return (
              <View key={i} style={[styles.allocRow, i > 0 && styles.allocDivider]}>
                <View style={[styles.allocDot, { backgroundColor: item.color }]} />
                <Text style={styles.allocLabel}>{typeInfo.label}</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.allocValue}>{formatCurrencyFull(item.value, currency)}</Text>
                <View style={styles.allocPct}>
                  <Text style={styles.allocPctText}>{item.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            );
          })}
        </GlassBox>

        {/* Holdings */}
        <View style={styles.holdingsHeader}>
          <Text style={styles.sectionTitle}>Holdings ({assets.length})</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setShowAddModal(true); Haptics.selectionAsync(); }}
          >
            <Plus color={theme.colors.accent} size={18} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {assets.length === 0 && (
          <GlassBox style={styles.emptyCard}>
            <Briefcase color={theme.colors.secondaryText} size={48} />
            <Text style={styles.emptyText}>No investments tracked yet</Text>
            <Text style={styles.emptySubtext}>Add your first asset to start tracking</Text>
          </GlassBox>
        )}

        {portfolio.performers.map(asset => {
          const typeInfo = ASSET_TYPES.find(t => t.id === asset.type)!;
          const Icon = typeInfo.icon;
          const assetPositive = asset.gainLoss >= 0;

          return (
            <TouchableOpacity key={asset.id} onLongPress={() => removeAsset(asset.id)} delayLongPress={600}>
              <GlassBox style={styles.assetCard}>
                <View style={styles.assetRow}>
                  <View style={[styles.assetIcon, { backgroundColor: `${typeInfo.color}20` }]}>
                    <Icon color={typeInfo.color} size={20} />
                  </View>
                  <View style={styles.assetInfo}>
                    <Text style={styles.assetName}>{asset.name}</Text>
                    <Text style={styles.assetType}>{typeInfo.label}</Text>
                  </View>
                  <View style={styles.assetRight}>
                    <Text style={styles.assetValue}>{formatCurrencyFull(asset.currentValue, currency)}</Text>
                    <View style={styles.assetReturnRow}>
                      {assetPositive
                        ? <TrendingUp color={theme.colors.status.green} size={12} />
                        : <TrendingDown color={theme.colors.status.red} size={12} />
                      }
                      <Text
                        style={[
                          styles.assetReturn,
                          { color: assetPositive ? theme.colors.status.green : theme.colors.status.red },
                        ]}
                      >
                        {assetPositive ? '+' : ''}{asset.returnPct.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>
              </GlassBox>
            </TouchableOpacity>
          );
        })}

        {/* Performance Summary */}
        {assets.length > 0 && portfolio.performers.length > 0 && (
          <GlassBox style={styles.perfCard}>
            <Text style={styles.perfTitle}>Performance Highlights</Text>
            <View style={styles.perfRow}>
              <View style={styles.perfItem}>
                <TrendingUp color={theme.colors.status.green} size={18} />
                <Text style={styles.perfLabel}>Top Performer</Text>
                <Text style={styles.perfValue}>{portfolio.performers[0].name}</Text>
                <Text style={[styles.perfReturn, { color: theme.colors.status.green }]}>
                  +{portfolio.performers[0].returnPct.toFixed(1)}%
                </Text>
              </View>
              {portfolio.performers.length > 1 && (
                <>
                  <View style={styles.perfDivider} />
                  <View style={styles.perfItem}>
                    <TrendingDown
                      color={portfolio.performers[portfolio.performers.length - 1].returnPct < 0
                        ? theme.colors.status.red
                        : theme.colors.status.green
                      }
                      size={18}
                    />
                    <Text style={styles.perfLabel}>Lowest Return</Text>
                    <Text style={styles.perfValue}>{portfolio.performers[portfolio.performers.length - 1].name}</Text>
                    <Text style={[
                      styles.perfReturn,
                      {
                        color: portfolio.performers[portfolio.performers.length - 1].returnPct < 0
                          ? theme.colors.status.red
                          : theme.colors.status.green,
                      },
                    ]}>
                      {portfolio.performers[portfolio.performers.length - 1].returnPct >= 0 ? '+' : ''}
                      {portfolio.performers[portfolio.performers.length - 1].returnPct.toFixed(1)}%
                    </Text>
                  </View>
                </>
              )}
            </View>
          </GlassBox>
        )}
      </ScrollView>

      {/* Add Asset Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowAddModal(false)}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(27,42,74,0.3)' }]} />
          </TouchableOpacity>
          <View style={styles.modalContent}>
            <GlassBox style={styles.addModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Investment</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X color={theme.colors.secondaryText} size={24} />
                </TouchableOpacity>
              </View>

              {/* Type Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {ASSET_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeChip,
                      newAsset.type === type.id && { backgroundColor: `${type.color}20`, borderColor: `${type.color}40` },
                    ]}
                    onPress={() => setNewAsset(p => ({ ...p, type: type.id }))}
                  >
                    <type.icon color={newAsset.type === type.id ? type.color : theme.colors.secondaryText} size={14} />
                    <Text style={[styles.typeChipText, newAsset.type === type.id && { color: type.color }]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Asset Name</Text>
                <TextInput
                  style={styles.input}
                  value={newAsset.name}
                  onChangeText={v => setNewAsset(p => ({ ...p, name: v }))}
                  placeholder="e.g., Tesla Stock"
                  placeholderTextColor={theme.colors.secondaryText}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Amount Invested</Text>
                  <TextInput
                    style={styles.input}
                    value={newAsset.investedAmount}
                    onChangeText={v => setNewAsset(p => ({ ...p, investedAmount: v }))}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.secondaryText}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Current Value</Text>
                  <TextInput
                    style={styles.input}
                    value={newAsset.currentValue}
                    onChangeText={v => setNewAsset(p => ({ ...p, currentValue: v }))}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.secondaryText}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={addAsset}>
                <LinearGradient
                  colors={[theme.colors.accent, '#1B2A4A']}
                  style={styles.addButtonGradient}
                >
                  <Text style={styles.addButtonText}>Add Investment</Text>
                </LinearGradient>
              </TouchableOpacity>
            </GlassBox>
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primaryText },
  headerSubtitle: { fontSize: 13, color: theme.colors.secondaryText, marginTop: 2 },
  overviewCard: { padding: 24, alignItems: 'center', marginBottom: 24 },
  donutCenter: { position: 'absolute', top: 0, bottom: 20, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  donutValue: { fontSize: 18, fontWeight: '800', color: theme.colors.primaryText, letterSpacing: -0.5 },
  donutLabel: { fontSize: 11, color: theme.colors.secondaryText, marginTop: 2 },
  gainRow: { marginBottom: 20 },
  gainBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  gainText: { fontSize: 14, fontWeight: '700' },
  overviewRow: { flexDirection: 'row', width: '100%' },
  overviewItem: { flex: 1, alignItems: 'center' },
  overviewLabel: { fontSize: 11, color: theme.colors.secondaryText, marginBottom: 4 },
  overviewValue: { fontSize: 15, fontWeight: '700', color: theme.colors.primaryText },
  overviewDivider: { width: 1, backgroundColor: 'rgba(27,42,74,0.05)', alignSelf: 'stretch' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.primaryText, marginBottom: 14 },
  allocationCard: { padding: 16, marginBottom: 24 },
  allocRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  allocDivider: { borderTopWidth: 1, borderTopColor: theme.colors.divider },
  allocDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  allocLabel: { fontSize: 14, color: theme.colors.primaryText, fontWeight: '500' },
  allocValue: { fontSize: 14, fontWeight: '600', color: theme.colors.secondaryText, marginRight: 10 },
  allocPct: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(27,42,74,0.05)',
  },
  allocPctText: { fontSize: 12, fontWeight: '700', color: theme.colors.accent },
  holdingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(62,146,204,0.1)',
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.accent },
  emptyCard: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: theme.colors.secondaryText },
  emptySubtext: { fontSize: 13, color: theme.colors.secondaryText, textAlign: 'center' },
  assetCard: { marginBottom: 10, padding: 14 },
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  assetIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  assetInfo: { flex: 1 },
  assetName: { fontSize: 15, fontWeight: '600', color: theme.colors.primaryText, marginBottom: 2 },
  assetType: { fontSize: 12, color: theme.colors.secondaryText },
  assetRight: { alignItems: 'flex-end' },
  assetValue: { fontSize: 15, fontWeight: '700', color: theme.colors.primaryText, marginBottom: 4 },
  assetReturnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assetReturn: { fontSize: 13, fontWeight: '700' },
  perfCard: { padding: 20, marginTop: 16 },
  perfTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText, marginBottom: 16 },
  perfRow: { flexDirection: 'row' },
  perfItem: { flex: 1, alignItems: 'center', gap: 6 },
  perfDivider: { width: 1, backgroundColor: 'rgba(27,42,74,0.05)', alignSelf: 'stretch' },
  perfLabel: { fontSize: 11, color: theme.colors.secondaryText, textAlign: 'center' },
  perfValue: { fontSize: 13, fontWeight: '600', color: theme.colors.primaryText, textAlign: 'center' },
  perfReturn: { fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { maxHeight: '80%' },
  addModal: { padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.primaryText },
  typeScroll: { marginBottom: 20 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: 'rgba(27,42,74,0.05)', borderWidth: 1, borderColor: theme.colors.divider,
  },
  typeChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.secondaryText },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, color: theme.colors.secondaryText, fontWeight: '600', marginBottom: 8 },
  input: {
    fontSize: 15, color: theme.colors.primaryText, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: 'rgba(27,42,74,0.05)', borderWidth: 1, borderColor: theme.colors.divider,
  },
  inputRow: { flexDirection: 'row', gap: 12 },
  addButton: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  addButtonGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  addButtonText: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText },
});
