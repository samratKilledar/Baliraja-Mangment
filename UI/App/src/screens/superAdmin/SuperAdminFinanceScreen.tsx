import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import client from '../../api/client';
import MovingSchoolBanner from '../../components/MovingSchoolBanner';
import SuperAdminTopBar from '../../components/SuperAdminTopBar';

type Summary = {
  fees: {
    totalExpected: number;
    totalCollected: number;
    totalDue: number;
  };
};

const EMPTY_SUMMARY: Summary = {
  fees: {totalExpected: 0, totalCollected: 0, totalDue: 0},
};

export default function SuperAdminFinanceScreen() {
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const {data} = await client.get('/dashboard/super-admin');
      setSummary({
        fees: {
          totalExpected: Number(data?.fees?.totalExpected) || 0,
          totalCollected: Number(data?.fees?.totalCollected) || 0,
          totalDue: Number(data?.fees?.totalDue) || 0,
        },
      });
      setError('');
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Unable to load income details.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSummary(true)}
          />
        }>
        <SuperAdminTopBar />
        <MovingSchoolBanner />
        <Text style={styles.title}>Total Income</Text>
        <Text style={styles.subtitle}>
          Year collected, pending fees, and expected income from the database.
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.heroCard}>
          <InfoLine
            label="Year Collected"
            value={`₹${summary.fees.totalCollected.toLocaleString('en-IN')}`}
            color="#15803D"
          />
          <InfoLine
            label="Pending"
            value={`₹${summary.fees.totalDue.toLocaleString('en-IN')}`}
            color="#B91C1C"
          />
          <InfoLine
            label="Expected"
            value={`₹${summary.fees.totalExpected.toLocaleString('en-IN')}`}
            color="#1D4ED8"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoLine({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, {color}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    marginTop: 14,
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 14,
  },
  loader: {
    marginTop: 18,
  },
  error: {
    marginTop: 14,
    color: '#B91C1C',
    fontWeight: '700',
  },
  heroCard: {
    marginTop: 16,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#D7E7FF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#2563EB',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 8},
    elevation: 4,
  },
  infoLine: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  infoLabel: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  infoValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
  },
});
