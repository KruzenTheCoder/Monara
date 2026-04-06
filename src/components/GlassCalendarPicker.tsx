import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { GlassBox } from './GlassBox';
import { theme } from '../utils/theme';
import * as Haptics from 'expo-haptics';

interface GlassCalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate?: Date;
}

export const GlassCalendarPicker: React.FC<GlassCalendarPickerProps> = ({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleSelect = (day: Date) => {
    Haptics.selectionAsync();
    onSelectDate(day);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <GlassBox style={styles.container} intensity={80}>
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} hitSlop={10}>
              <ChevronLeft color="#1B2A4A" size={24} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{format(currentMonth, 'MMMM yyyy')}</Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={10}>
              <ChevronRight color="#1B2A4A" size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <X color="rgba(27,42,74,0.4)" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDays}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <Text key={d} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {daysInMonth.map((day, i) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => handleSelect(day)}
                  disabled={!isCurrentMonth} // Optionally disable if you only want current month clickable
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      !isCurrentMonth && styles.dayTextInactive,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassBox>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayBg,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    padding: 20,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B2A4A',
  },
  closeBtn: {
    position: 'absolute',
    right: -10,
    top: -36,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayText: {
    width: 40,
    textAlign: 'center',
    color: '#6B7B98',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: '14%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.accent,
  },
  dayText: {
    fontSize: 14,
    color: '#1B2A4A',
  },
  dayTextSelected: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dayTextInactive: {
    color: 'rgba(27,42,74,0.2)',
  },
});
