import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import client from '../../api/client';
import MovingSchoolBanner from '../../components/MovingSchoolBanner';
import SuperAdminTopBar from '../../components/SuperAdminTopBar';

type StudentRow = {
  _id: string;
  enrollmentNo?: string;
  age?: number;
  gender?: string;
  batchId?: {
    batchName?: string;
  };
  userId?: {
    fullName?: string;
    phone?: string;
    email?: string;
    passwordVisible?: string;
  };
};

export default function SuperAdminStudentList() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadStudents = useCallback(async (query = '', isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const {data} = await client.get('/students', {
        params: {q: query || undefined, page: 1, limit: 25},
      });
      setStudents(Array.isArray(data?.items) ? data.items : []);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load student list.');
      setStudents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadStudents(search.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [loadStudents, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStudents(search.trim(), true)}
          />
        }>
        <SuperAdminTopBar />
        <MovingSchoolBanner />
        <Text style={styles.title}>Student List</Text>
        <Text style={styles.subtitle}>
          Search students by name, phone, email, or enrollment number.
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search student"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !students.length ? (
          <Text style={styles.empty}>No students found.</Text>
        ) : null}

        {students.map((student, index) => (
          <View key={student._id} style={styles.card}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>
                {student.userId?.fullName || 'Student'}
              </Text>
              <Text style={styles.meta}>
                Enroll: {student.enrollmentNo || '—'}
              </Text>
              <Text style={styles.meta}>
                Phone: {student.userId?.phone || '—'}
              </Text>
              <Text style={styles.meta}>
                Email: {student.userId?.email || '—'}
              </Text>
              <Text style={styles.meta}>
                Batch: {student.batchId?.batchName || '—'}
              </Text>
              <Text style={styles.meta}>
                Age: {student.age ?? '—'} Gender: {student.gender || '—'}
              </Text>
              <Text style={styles.password}>
                Password: {student.userId?.passwordVisible || '123456'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
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
  searchInput: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  loader: {
    marginTop: 18,
  },
  error: {
    marginTop: 14,
    color: '#B91C1C',
    fontWeight: '700',
  },
  empty: {
    marginTop: 18,
    color: '#6B7280',
    fontSize: 14,
  },
  card: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  indexBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
  },
  name: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    marginTop: 4,
    color: '#4B5563',
    fontSize: 13,
  },
  password: {
    marginTop: 6,
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },
});
