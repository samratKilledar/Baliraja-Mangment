import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import COLORS from '../config/colors';

type LoadingOverlayProps = {
  visible: boolean;
  label?: string;
};

export default function LoadingOverlay({ visible, label = 'Loading...' }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  card: {
    width: 180,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  label: {
    marginTop: 10,
    color: COLORS.textDark,
    fontWeight: '600'
  }
});
