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
import COLORS from '../../config/colors';
import MovingSchoolBanner from '../../components/MovingSchoolBanner';
import SuperAdminTopBar from '../../components/SuperAdminTopBar';

type Summary = {
  totalUsers: number;
  studentCount: number;
  teacherCount: number;
  workerCount: number;
  fees: {
    totalExpected: number;
    totalCollected: number;
    totalDue: number;
  };
};

const EMPTY_SUMMARY: Summary = {
  totalUsers: 0,
  studentCount: 0,
  teacherCount: 0,
  workerCount: 0,
  fees: {totalExpected: 0, totalCollected: 0, totalDue: 0},
};

export default function SuperAdminHome() {
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
        totalUsers: Number(data?.totalUsers) || 0,
        studentCount: Number(data?.studentCount) || 0,
        teacherCount: Number(data?.teacherCount) || 0,
        workerCount: Number(data?.workerCount) || 0,
        fees: {
          totalExpected: Number(data?.fees?.totalExpected) || 0,
          totalCollected: Number(data?.fees?.totalCollected) || 0,
          totalDue: Number(data?.fees?.totalDue) || 0,
        },
      });
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load analytics hub.');
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
        <View style={styles.headerCard}>
          <SuperAdminTopBar />
          <MovingSchoolBanner />
          <Text style={styles.title}>Status</Text>
          <Text style={styles.subtitle}>
            Live counts and finance summary from the database.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={styles.loader}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.statsGrid}>
          <StatCard
            label="Total Users"
            value={summary.totalUsers}
            accent={COLORS.primary}
          />
          <StatCard
            label="Students"
            value={summary.studentCount}
            accent={COLORS.success}
          />
          <StatCard
            label="Teachers"
            value={summary.teacherCount}
            accent={COLORS.info || COLORS.accent}
          />
          <StatCard
            label="Workers"
            value={summary.workerCount}
            accent={COLORS.warning}
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Finance Snapshot</Text>
          <View style={styles.financeRow}>
            <FinanceCard
              label="Pending Money"
              value={summary.fees.totalExpected}
              tint="#DBEAFE"
              textColor="#1D4ED8"
            />
            <FinanceCard
              label="Collected"
              value={summary.fees.totalCollected}
              tint="#DCFCE7"
              textColor="#15803D"
            />
            <FinanceCard
              label="Remaining"
              value={summary.fees.totalDue}
              tint="#FEE2E2"
              textColor="#B91C1C"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <View style={[styles.statCard, {borderTopColor: accent}]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, {color: accent}]}>{value}</Text>
    </View>
  );
}

function FinanceCard({
  label,
  value,
  tint,
  textColor,
}: {
  label: string;
  value: number;
  tint: string;
  textColor: string;
}) {
  return (
    <View style={[styles.financeCard, {backgroundColor: tint}]}>
      <Text style={styles.financeLabel}>{label}</Text>
      <Text style={[styles.financeValue, {color: textColor}]}>
        ₹{value.toLocaleString('en-IN')}
      </Text>
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
    gap: 14,
  },
  headerCard: {
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#D7E7FF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#2563EB',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 8},
    elevation: 4,
  },
  kicker: {
    marginTop: 12,
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 12,
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: '#4B5563',
    fontSize: 14,
  },
  loader: {
    marginTop: 10,
  },
  error: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    minHeight: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 5,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  statValue: {
    marginTop: 14,
    fontSize: 28,
    fontWeight: '800',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  panelTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  financeRow: {
    marginTop: 14,
    gap: 10,
  },
  financeCard: {
    borderRadius: 16,
    padding: 14,
  },
  financeLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  financeValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
  },
});
