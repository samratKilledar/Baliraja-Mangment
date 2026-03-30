import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import DashboardScreen from '../../components/DashboardScreen';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

export default function TeacherSalary() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [record, setRecord] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSalary();
  }, [user?.phone]);

  async function fetchSalary() {
    if (!user?.phone) return;
    setLoading(true);
    try {
      const { data } = await client.get(`/teachers/public/by-phone/${user.phone}`);
      setRecord(data?.teacher || null);
      setError('');
    } catch (err: any) {
      setRecord(null);
      setError(err?.response?.data?.message || 'Unable to load salary');
    } finally {
      setLoading(false);
    }
  }

  const payments = record?.payments || [];

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetchSalary();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <DashboardScreen
      title="Salary & Contract"
      subtitle="Totals, history and contract dates"
      role="teacher"
      loading={loading}
      loadingLabel="Loading salary..."
      refreshing={refreshing}
      onRefresh={handleRefresh}
      filter=""
      filters={[]}
      onFilterChange={() => {}}
    >
      <View style={styles.box}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {record ? (
          <>
            <Text style={styles.heading}>Contract</Text>
            <Text style={styles.subtext}>Start: {record.contractStart ? new Date(record.contractStart).toLocaleDateString() : '—'}</Text>
            <Text style={styles.subtext}>End: {record.contractEnd ? new Date(record.contractEnd).toLocaleDateString() : '—'}</Text>
            <Text style={styles.subtext}>Total: ₹{record.totalContractAmount || 0}</Text>
            <Text style={styles.subtext}>Paid: ₹{record.paidAmount || 0}</Text>
            <Text style={styles.subtext}>Balance: ₹{(record.totalContractAmount || 0) - (record.paidAmount || 0)}</Text>
            <Text style={[styles.heading, { marginTop: 10 }]}>Salary</Text>
            <Text style={styles.subtext}>Monthly: ₹{record.monthlySalary || 0}</Text>
            <Text style={styles.subtext}>Salary Paid: ₹{record.salaryPaidAmount || 0}</Text>

            <Text style={[styles.heading, { marginTop: 12 }]}>Payment History</Text>
            <FlatList
              data={payments.slice().reverse()}
              keyExtractor={(item, idx) => item._id || String(idx)}
              renderItem={({ item }) => (
                <View style={styles.rowItem}>
                  <Text style={styles.subtext}>{new Date(item.paidOn).toLocaleDateString()} — ₹{item.amount}</Text>
                  <Text style={styles.subtext}>Type: {item.paymentType || 'contract'}</Text>
                  {item.note ? <Text style={styles.subtext}>Note: {item.note}</Text> : null}
                </View>
              )}
              ListEmptyComponent={<Text style={styles.subtext}>No payments yet.</Text>}
            />
          </>
        ) : (
          <Text style={styles.subtext}>No record found.</Text>
        )}
      </View>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#d7dff6', borderRadius: 12, backgroundColor: '#f9fbff' },
  heading: { color: '#1f2f75', fontWeight: '800' },
  subtext: { marginTop: 4, color: '#5e688f' },
  rowItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef2fb' },
  error: { color: '#c0392b', marginBottom: 6 }
});
