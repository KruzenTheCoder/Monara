import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  X,
  Edit3,
  DollarSign,
  Calendar,
  Tag,
  ChevronDown,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { EXPENSE_CATEGORIES } from '../types';
import { format } from 'date-fns';

interface ScannedItem {
  id: string;
  name: string;
  amount: number;
  category: string;
}

export const ReceiptScannerScreen = () => {
  const navigation = useNavigation();
  const { addTransaction, user } = useFinancial();
  const currency = user.currency || 'USD';

  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'review' | 'saved'>('idle');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [merchantName, setMerchantName] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Food & Dining');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [note, setNote] = useState('');
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Simulated receipt scanning
  const simulateScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanState('scanning');

    // Scanning animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Pulse animation  
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Simulate OCR processing
    setTimeout(() => {
      scanAnim.stopAnimation();
      pulseAnim.stopAnimation();
      scanAnim.setValue(0);
      pulseAnim.setValue(1);

      // Generate realistic sample items
      const sampleReceipts = [
        {
          merchant: 'Grocery Mart',
          category: 'Food & Dining',
          items: [
            { name: 'Organic Milk', amount: 5.49 },
            { name: 'Fresh Bread', amount: 3.99 },
            { name: 'Chicken Breast', amount: 8.99 },
            { name: 'Mixed Vegetables', amount: 4.29 },
            { name: 'Coffee Beans', amount: 12.99 },
          ],
        },
        {
          merchant: 'Tech Store',
          category: 'Shopping',
          items: [
            { name: 'USB-C Cable', amount: 14.99 },
            { name: 'Phone Case', amount: 24.99 },
            { name: 'Screen Protector', amount: 9.99 },
          ],
        },
        {
          merchant: 'Gas Station',
          category: 'Transport',
          items: [
            { name: 'Regular Unleaded', amount: 45.50 },
            { name: 'Car Wash', amount: 8.00 },
          ],
        },
      ];

      const receipt = sampleReceipts[Math.floor(Math.random() * sampleReceipts.length)];
      const items: ScannedItem[] = receipt.items.map((item, i) => ({
        id: `item_${i}`,
        name: item.name,
        amount: item.amount,
        category: receipt.category,
      }));

      setScannedItems(items);
      setMerchantName(receipt.merchant);
      setSelectedCategory(receipt.category);
      setTotalAmount(items.reduce((s, i) => s + i.amount, 0));
      setScanState('review');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2500);
  };

  const removeItem = (id: string) => {
    Haptics.selectionAsync();
    const updated = scannedItems.filter(i => i.id !== id);
    setScannedItems(updated);
    setTotalAmount(updated.reduce((s, i) => s + i.amount, 0));
  };

  const saveReceipt = async () => {
    if (totalAmount <= 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      await addTransaction({
        type: 'expense',
        amount: totalAmount,
        category: selectedCategory,
        date: new Date().toISOString(),
        merchant_name: merchantName || 'Scanned Receipt',
        note: note || `Receipt: ${scannedItems.map(i => i.name).join(', ')}`,
        is_manual_entry: false,
      });

      setScanState('saved');

      setTimeout(() => {
        setScanState('idle');
        setScannedItems([]);
        setMerchantName('');
        setTotalAmount(0);
        setNote('');
      }, 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
    }
  };

  const resetScanner = () => {
    setScanState('idle');
    setScannedItems([]);
    setMerchantName('');
    setTotalAmount(0);
    setNote('');
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
            <Text style={styles.headerTitle}>Receipt Scanner</Text>
            <Text style={styles.headerSubtitle}>Scan & log expenses instantly</Text>
          </View>
        </View>

        {/* Idle State — Scanner */}
        {scanState === 'idle' && (
          <>
            <GlassBox style={styles.scanArea}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <View style={styles.scanContent}>
                  <FileText color={theme.colors.secondaryText} size={64} />
                  <Text style={styles.scanHint}>Position receipt within the frame</Text>
                </View>
              </View>
            </GlassBox>

            <View style={styles.scanActions}>
              <TouchableOpacity style={styles.scanBtn} onPress={simulateScan}>
                <LinearGradient
                  colors={[theme.colors.accent, '#1B2A4A']}
                  style={styles.scanBtnGradient}
                >
                  <Camera color={theme.colors.primaryText} size={24} />
                  <Text style={styles.scanBtnText}>Scan Receipt</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.galleryBtn} onPress={simulateScan}>
                <ImageIcon color={theme.colors.secondaryText} size={20} />
                <Text style={styles.galleryBtnText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

            <GlassBox style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Zap color="#FBBF24" size={18} />
                <Text style={styles.tipsTitle}>Scanning Tips</Text>
              </View>
              <Text style={styles.tipItem}>• Place receipt on a flat, well-lit surface</Text>
              <Text style={styles.tipItem}>• Ensure all text is clearly visible</Text>
              <Text style={styles.tipItem}>• Avoid shadows and glare</Text>
              <Text style={styles.tipItem}>• Hold your phone steady while scanning</Text>
            </GlassBox>
          </>
        )}

        {/* Scanning State */}
        {scanState === 'scanning' && (
          <GlassBox style={styles.scanningCard}>
            <Animated.View style={[styles.scanningFrame, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.scanningInner}>
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      opacity: scanAnim,
                      transform: [{
                        translateY: scanAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 200],
                        }),
                      }],
                    },
                  ]}
                />
                <FileText color={theme.colors.secondaryText} size={80} />
              </View>
            </Animated.View>
            <Text style={styles.scanningText}>Scanning receipt...</Text>
            <Text style={styles.scanningSubtext}>Extracting items and amounts</Text>
          </GlassBox>
        )}

        {/* Review State */}
        {scanState === 'review' && (
          <>
            {/* Merchant & Category */}
            <GlassBox style={styles.merchantCard}>
              <View style={styles.merchantRow}>
                <Edit3 color={theme.colors.secondaryText} size={16} />
                <TextInput
                  style={styles.merchantInput}
                  value={merchantName}
                  onChangeText={setMerchantName}
                  placeholder="Merchant name"
                  placeholderTextColor={theme.colors.secondaryText}
                />
              </View>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Tag color={theme.colors.accent} size={16} />
                <Text style={styles.categoryText}>{selectedCategory}</Text>
                <ChevronDown color={theme.colors.secondaryText} size={16} />
              </TouchableOpacity>

              {showCategoryPicker && (
                <View style={styles.categoryList}>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryItem,
                        selectedCategory === cat.label && styles.categoryItemActive,
                      ]}
                      onPress={() => {
                        setSelectedCategory(cat.label);
                        setShowCategoryPicker(false);
                        Haptics.selectionAsync();
                      }}
                    >
                      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      <Text style={[
                        styles.categoryItemText,
                        selectedCategory === cat.label && { color: theme.colors.accent },
                      ]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </GlassBox>

            {/* Scanned Items */}
            <Text style={styles.sectionTitle}>Scanned Items ({scannedItems.length})</Text>
            {scannedItems.map(item => (
              <GlassBox key={item.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemAmount}>{formatCurrencyFull(item.amount, currency)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeItem(item.id)}
                  >
                    <X color={theme.colors.secondaryText} size={16} />
                  </TouchableOpacity>
                </View>
              </GlassBox>
            ))}

            {/* Total */}
            <GlassBox style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>{formatCurrencyFull(totalAmount, currency)}</Text>
            </GlassBox>

            {/* Note */}
            <GlassBox style={styles.noteCard}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note (optional)..."
                placeholderTextColor={theme.colors.secondaryText}
                multiline
              />
            </GlassBox>

            {/* Actions */}
            <View style={styles.reviewActions}>
              <TouchableOpacity style={styles.saveBtn} onPress={saveReceipt}>
                <LinearGradient
                  colors={[theme.colors.accent, '#1B2A4A']}
                  style={styles.saveBtnGradient}
                >
                  <CheckCircle2 color={theme.colors.primaryText} size={20} />
                  <Text style={styles.saveBtnText}>Save Transaction</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={resetScanner}>
                <Text style={styles.cancelBtnText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Saved State */}
        {scanState === 'saved' && (
          <GlassBox style={styles.savedCard}>
            <View style={styles.savedIcon}>
              <CheckCircle2 color={theme.colors.status.green} size={64} />
            </View>
            <Text style={styles.savedTitle}>Saved!</Text>
            <Text style={styles.savedSubtitle}>
              {formatCurrencyFull(totalAmount, currency)} logged as {selectedCategory}
            </Text>
          </GlassBox>
        )}
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primaryText },
  headerSubtitle: { fontSize: 13, color: theme.colors.secondaryText, marginTop: 2 },
  scanArea: { padding: 24, marginBottom: 20 },
  scanFrame: {
    height: 280, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
    borderColor: 'rgba(62,146,204,0.2)', justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: theme.colors.accent, borderWidth: 3,
  },
  cornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanContent: { alignItems: 'center', gap: 16 },
  scanHint: { fontSize: 14, color: theme.colors.secondaryText, fontWeight: '500' },
  scanActions: { gap: 12, marginBottom: 20 },
  scanBtn: { borderRadius: 14, overflow: 'hidden' },
  scanBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 14,
  },
  scanBtnText: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText },
  galleryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(27,42,74,0.05)', borderWidth: 1, borderColor: theme.colors.divider,
  },
  galleryBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.secondaryText },
  tipsCard: { padding: 16 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tipsTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.primaryText },
  tipItem: { fontSize: 13, color: theme.colors.secondaryText, lineHeight: 22 },
  scanningCard: { padding: 48, alignItems: 'center' },
  scanningFrame: { marginBottom: 24 },
  scanningInner: {
    width: 200, height: 260, borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(62,146,204,0.2)',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: theme.colors.accent, top: 0,
  },
  scanningText: { fontSize: 18, fontWeight: '700', color: theme.colors.primaryText, marginBottom: 8 },
  scanningSubtext: { fontSize: 14, color: theme.colors.secondaryText },
  merchantCard: { padding: 16, marginBottom: 16 },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  merchantInput: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.colors.primaryText },
  categorySelector: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: 'rgba(27,42,74,0.05)',
  },
  categoryText: { fontSize: 14, fontWeight: '500', color: theme.colors.accent, flex: 1 },
  categoryList: { marginTop: 12, gap: 4 },
  categoryItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
  },
  categoryItemActive: { backgroundColor: 'rgba(62,146,204,0.1)' },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  categoryItemText: { fontSize: 14, color: theme.colors.secondaryText },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText, marginBottom: 12 },
  itemCard: { marginBottom: 8, padding: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 14, color: theme.colors.primaryText, fontWeight: '500' },
  itemAmount: { fontSize: 14, color: theme.colors.primaryText, fontWeight: '700' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14, marginLeft: 10,
    backgroundColor: 'rgba(27,42,74,0.05)', justifyContent: 'center', alignItems: 'center',
  },
  totalCard: {
    padding: 20, marginTop: 8, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: theme.colors.secondaryText },
  totalAmount: { fontSize: 24, fontWeight: '800', color: theme.colors.primaryText },
  noteCard: { padding: 14, marginBottom: 20 },
  noteInput: { fontSize: 14, color: theme.colors.primaryText, minHeight: 60, textAlignVertical: 'top' },
  reviewActions: { gap: 12 },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 14,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: theme.colors.primaryText },
  cancelBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.1)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#FF3B30' },
  savedCard: { padding: 48, alignItems: 'center' },
  savedIcon: { marginBottom: 20 },
  savedTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.primaryText, marginBottom: 8 },
  savedSubtitle: { fontSize: 15, color: theme.colors.secondaryText, textAlign: 'center' },
});
