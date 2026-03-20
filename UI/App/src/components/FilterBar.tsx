import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import COLORS from '../config/colors';

type FilterBarProps = {
  title?: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export default function FilterBar({ title = 'Filter', options, selected, onSelect }: FilterBarProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const active = option === selected;
          return (
            <Pressable
              key={option}
              style={({ pressed }) => [styles.chip, active && styles.activeChip, pressed && styles.pressedChip]}
              onPress={() => onSelect(option)}
            >
              <Text style={[styles.chipText, active && styles.activeChipText]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#d6def8',
    borderRadius: 14,
    padding: 12
  },
  title: {
    color: '#4f5f96',
    fontWeight: '600',
    marginBottom: 8
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d8def1',
    backgroundColor: '#f8faff'
  },
  activeChip: {
    borderColor: '#2944ad',
    backgroundColor: '#e6edff'
  },
  pressedChip: {
    transform: [{ scale: 0.97 }]
  },
  chipText: {
    color: '#374266',
    textTransform: 'capitalize'
  },
  activeChipText: {
    color: '#1f3698',
    fontWeight: '700'
  }
});
