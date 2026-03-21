import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const monthlyData = [
  { label: 'Nov', score: 74 },
  { label: 'Dec', score: 78 },
  { label: 'Jan', score: 82 },
  { label: 'Feb', score: 85 },
  { label: 'Mar', score: 88 }
];

type Props = {
  title: string;
  subtitle: string;
};

export default function PerformancePreview({ title, subtitle }: Props) {
  const average = Math.round(monthlyData.reduce((sum, item) => sum + item.score, 0) / monthlyData.length);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Average</Text>
            <Text style={styles.summaryValue}>{average}%</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Best Month</Text>
            <Text style={styles.summaryValue}>Mar</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Monthly Performance</Text>
        {monthlyData.map((item) => (
          <View key={item.label} style={styles.barRow}>
            <Text style={styles.barLabel}>{item.label}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${item.score}%` }]} />
            </View>
            <Text style={styles.barValue}>{item.score}%</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f7f9fd'
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e0f4'
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2f75'
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#4b5774'
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#eef3ff'
  },
  summaryLabel: {
    fontSize: 12,
    color: '#5e688f'
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: '#1f3ca8'
  },
  chartCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e0f4'
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1f2f75',
    marginBottom: 10
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10
  },
  barLabel: {
    width: 36,
    color: '#4b5774',
    fontWeight: '700'
  },
  track: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#e7ecfb',
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3b82f6'
  },
  barValue: {
    width: 46,
    textAlign: 'right',
    color: '#1f2f75',
    fontWeight: '700'
  }
});
