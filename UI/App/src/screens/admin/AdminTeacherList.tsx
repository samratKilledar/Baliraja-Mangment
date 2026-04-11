import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import client from '../../api/client';
import ScreenBackground from '../../components/ScreenBackground';
import COLORS from '../../config/colors';

type TeacherRow = {
  _id: string;
  specialization?: string;
  experienceYears?: number;
  userId?: {
    fullName?: string;
    phone?: string;
    email?: string;
    passwordVisible?: string;
  };
};

export default function AdminTeacherList() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTeachers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const {data} = await client.get('/teachers');
      setTeachers(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load teacher list.');
      setTeachers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(t => {
      const name = t.userId?.fullName || '';
      const phone = t.userId?.phone || '';
      const email = t.userId?.email || '';
      const specialization = t.specialization || '';
      return (
        name.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        specialization.toLowerCase().includes(q)
      );
    });
  }, [search, teachers]);

  React.useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  return (
    <ScreenBackground>
      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadTeachers(true)} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Teacher List</Text>
            <Text style={styles.subtitle}>
              Search by name, phone, email, or specialization.
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search teacher"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
            />
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!loading && !filtered.length ? (
              <Text style={styles.empty}>No teachers found.</Text>
            ) : null}
          </View>
        }
        renderItem={({item: teacher, index}) => (
          <View style={styles.card}>
            <View style={styles.nameRow}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{index + 1}</Text>
              </View>
              <View style={styles.nameBlock}>
                <Text style={styles.name}>{teacher.userId?.fullName || 'Teacher'}</Text>
                <Text style={styles.meta}>
                  {teacher.specialization || 'Specialization'} •{' '}
                  {teacher.experienceYears ?? '—'} yrs exp
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="phone" size={16} color={COLORS.primary} />
              <Text style={styles.detailText}>
                {teacher.userId?.phone || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="email-outline" size={16} color={COLORS.primary} />
              <Text style={styles.detailText}>
                {teacher.userId?.email || '—'}
              </Text>
            </View>

            {teacher.userId?.passwordVisible ? (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="lock-outline" size={16} color={COLORS.primary} />
                <Text style={styles.detailText}>
                  Login: {teacher.userId.passwordVisible}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.textGray,
  },
  searchInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textDark,
  },
  loader: {
    marginTop: 16,
  },
  error: {
    marginTop: 10,
    color: COLORS.danger,
    fontWeight: '600',
  },
  empty: {
    marginTop: 12,
    color: COLORS.textGray,
    textAlign: 'center',
  },
  card: {
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    shadowColor: COLORS.primaryLight,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  meta: {
    marginTop: 2,
    color: COLORS.textGray,
    fontSize: 12,
  },
  detailRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: COLORS.textDark,
    fontSize: 13,
  },
});
