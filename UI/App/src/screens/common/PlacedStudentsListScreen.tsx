import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import client from '../../api/client';
import ScreenBackground from '../../components/ScreenBackground';

type PlacedStudentRow = {
  _id: string;
  placedDate?: string;
  name?: string;
  mobileNo?: string;
};

type Props = {
  title?: string;
};

export default function PlacedStudentsListScreen({title = 'Placed Students'}: Props) {
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
      setError(err?.response?.data?.message || 'Unable to load placed students.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlaced();
  }, [loadPlaced]);

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPlaced(true)}
          />
        }>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Name, mobile number and placed date.</Text>

        {loading ? <ActivityIndicator size="large" color="#2563EB" style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !items.length ? <Text style={styles.empty}>No placed students found.</Text> : null}

        {items.map((item, idx) => (
          <View key={item._id} style={styles.card}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{idx + 1}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{item.name || 'Student'}</Text>
              <Text style={styles.meta}>Mobile: {item.mobileNo || '—'}</Text>
              <Text style={styles.meta}>
                Placed Date: {item.placedDate ? new Date(item.placedDate).toLocaleDateString() : '—'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'transparent'},
  content: {padding: 16, paddingBottom: 24},
  title: {marginTop: 14, fontSize: 24, fontWeight: '800', color: '#111827'},
  subtitle: {marginTop: 6, color: '#6B7280', fontSize: 14},
  loader: {marginTop: 18},
  error: {marginTop: 12, color: '#B91C1C', fontWeight: '700'},
  empty: {marginTop: 18, color: '#6B7280', fontSize: 14},
  card: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  indexBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {color: '#1D4ED8', fontWeight: '800'},
  body: {flex: 1, gap: 3},
  name: {color: '#111827', fontSize: 16, fontWeight: '800'},
  meta: {color: '#374151', fontSize: 13},
});
