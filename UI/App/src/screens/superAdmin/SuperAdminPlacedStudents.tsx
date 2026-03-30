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

type PlacedStudentRow = {
  _id: string;
  placedDate?: string;
  name?: string;
  age?: number;
  mobileNo?: string;
  address?: string;
  batch?: string;
  note?: string;
  opinion?: string;
  academicYear?: string;
};

export default function SuperAdminPlacedStudents() {
  const [items, setItems] = useState<PlacedStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadPlaced = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const {data} = await client.get('/placed-students', {params: {page: 1, limit: 100}});
      setItems(Array.isArray(data?.items) ? data.items : []);
      setError('');
    } catch (err: any) {
      setItems([]);
      setError(err?.response?.data?.message || 'Unable to load placed student list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlaced();
  }, [loadPlaced]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPlaced(true)}
          />
        }>
        <SuperAdminTopBar />
        <MovingSchoolBanner />
        <Text style={styles.title}>Placed Student List</Text>
        <Text style={styles.subtitle}>Super admin can view all placed student information here.</Text>

        {loading ? <ActivityIndicator size="large" color="#2563EB" style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !items.length ? <Text style={styles.empty}>No placed students added yet.</Text> : null}

        {items.map((item, idx) => (
          <View key={item._id} style={styles.card}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{idx + 1}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{item.name || 'Student'}</Text>
              <Text style={styles.meta}>Placed Date: {item.placedDate ? new Date(item.placedDate).toLocaleDateString() : '—'}</Text>
              <Text style={styles.meta}>Age: {item.age ?? '—'} | Mobile: {item.mobileNo || '—'}</Text>
              <Text style={styles.meta}>Address: {item.address || '—'}</Text>
              <Text style={styles.meta}>Batch: {item.batch || '—'} | Academic Year: {item.academicYear || '—'}</Text>
              <Text style={styles.meta}>Opinion: {item.opinion || '—'}</Text>
              <Text style={styles.meta}>Note: {item.note || '—'}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 24 },
  title: { marginTop: 14, fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6B7280', fontSize: 14 },
  loader: { marginTop: 18 },
  error: { marginTop: 12, color: '#B91C1C', fontWeight: '700' },
  empty: { marginTop: 18, color: '#6B7280', fontSize: 14 },
  card: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    flexDirection: 'row',
    gap: 10
  },
  indexBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  indexText: { color: '#1D4ED8', fontWeight: '800' },
  body: { flex: 1, gap: 3 },
  name: { color: '#111827', fontSize: 16, fontWeight: '800' },
  meta: { color: '#374151', fontSize: 13 }
});
