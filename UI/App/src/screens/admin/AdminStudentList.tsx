import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import client from '../../api/client';
import ScreenBackground from '../../components/ScreenBackground';

type StudentRow = {
  _id: string;
  enrollmentNo?: string;
  age?: number;
  gender?: string;
  batchId?: {
    batchName?: string;
  };
  userId?: {
    _id?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    passwordVisible?: string;
  };
};

type FeeRow = {
  studentId?: {
    _id?: string;
  };
  totalAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
};

function IconBadge({
  name,
  color,
  background,
}: {
  name: string;
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.iconBadge, {backgroundColor: background}]}>
      <MaterialCommunityIcons name={name} size={16} color={color} />
    </View>
  );
}

export default function AdminStudentList() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [feesByStudent, setFeesByStudent] = useState<Record<string, FeeRow>>(
    {},
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [freshPasswords, setFreshPasswords] = useState<Record<string, string>>(
    {},
  );
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );

  const loadStudents = useCallback(
    async (query = '', nextPage = 1, isRefresh = false, append = false) => {
      if (!append && nextPage === 1) {
        setStudents([]);
        setFeesByStudent({});
      }
      if (isRefresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const [{data: studentData}, {data: feeData}] = await Promise.all([
          client.get('/students', {
            params: {q: query || undefined, page: nextPage, limit: 10},
          }),
          client.get('/fees/list', {params: {page: 1, limit: 1000}}),
        ]);
        const nextItems = Array.isArray(studentData?.items)
          ? studentData.items
          : [];
        setStudents(prev => (append ? [...prev, ...nextItems] : nextItems));
        setPage(studentData?.meta?.page || nextPage);
        setTotalPages(studentData?.meta?.totalPages || 1);
        const nextFeeMap: Record<string, FeeRow> = {};
        (feeData?.items || []).forEach((fee: FeeRow) => {
          const studentId = fee?.studentId?._id;
          if (studentId) {
            nextFeeMap[studentId] = fee;
          }
        });
        setFeesByStudent(nextFeeMap);
        setError('');
      } catch (err: any) {
        setError(
          err?.response?.data?.message || 'Unable to load student list.',
        );
        if (!append) {
          setStudents([]);
          setFeesByStudent({});
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadStudents(search.trim(), page);
  }, [loadStudents]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadStudents(search.trim(), 1);
    }, 350);
    return () => clearTimeout(handler);
  }, [loadStudents, search]);

  const loadMore = () => {
    if (loadingMore || loading) return;
    if (page >= totalPages) return;
    loadStudents(search.trim(), page + 1, false, true);
  };

  return (
    <ScreenBackground>
      <FlatList
        data={students}
        keyExtractor={item => item._id}
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStudents(search.trim(), 1, true)}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.2}
        ListHeaderComponent={
          <View>
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
          </View>
        }
        renderItem={({item: student, index}) => (
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <View style={styles.nameRow}>
                <View style={styles.nameBlock}>
                  <View style={styles.nameHeader}>
                    <View style={styles.nameTopRow}>
                      <Text style={styles.indexInline}>{index + 1}.</Text>
                      <Text style={styles.name}>
                        {student.userId?.fullName || 'Student'}
                      </Text>
                    </View>
                    <Text style={styles.nameMeta}>
                      Age: {student.age ?? '—'} | Gender:{' '}
                      {student.gender || '—'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <IconBadge
                      name="phone"
                      color="#2563EB"
                      background="#DBEAFE"
                    />
                    <Text style={styles.metaText}>
                      {student.userId?.phone || '—'}
                    </Text>
                    <Pressable
                      style={styles.actionChip}
                      onPress={() => {
                        const phone = student.userId?.phone;
                        if (phone) Linking.openURL(`tel:${phone}`);
                      }}>
                      <Text style={styles.actionText}>Call</Text>
                    </Pressable>
                  </View>
                  <View style={styles.metaRow}>
                    <IconBadge
                      name="email"
                      color="#0F766E"
                      background="#CCFBF1"
                    />
                    <Text style={styles.metaText}>
                      {student.userId?.email || '—'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <IconBadge
                      name="account-badge"
                      color="#7C3AED"
                      background="#EDE9FE"
                    />
                    <Text style={styles.metaText}>
                      Enrollment: {student.enrollmentNo || '—'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <IconBadge
                      name="google-classroom"
                      color="#B45309"
                      background="#FEF3C7"
                    />
                    <Text style={styles.metaText}>
                      Batch: {student.batchId?.batchName || '—'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <IconBadge
                      name="currency-inr"
                      color="#16A34A"
                      background="#DCFCE7"
                    />
                    <Text style={styles.metaText}>
                      Fees: ₹{feesByStudent[student._id]?.paidAmount || 0} / ₹
                      {feesByStudent[student._id]?.totalAmount || 0} • Due ₹
                      {feesByStudent[student._id]?.dueAmount || 0}
                    </Text>
                  </View>
                  <View style={styles.passwordRow}>
                    <Text style={styles.passwordLabel}>Login password</Text>
                    <Pressable
                      style={styles.passwordChip}
                      onPress={() =>
                        setShowPasswords(prev => ({
                          ...prev,
                          [student._id]: !prev[student._id],
                        }))
                      }>
                      <Text style={styles.passwordChipText}>
                        {showPasswords[student._id] ? 'Hide' : 'Show'}
                      </Text>
                    </Pressable>
                    {showPasswords[student._id] ? (
                      <Text style={styles.passwordValue}>
                        {freshPasswords[student._id] ||
                          student.userId?.passwordVisible ||
                          '—'}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : null
        }
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
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    color: '#6B7280',
  },
  searchInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  loader: {
    marginTop: 16,
  },
  error: {
    marginTop: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  empty: {
    marginTop: 12,
    color: '#6B7280',
  },
  card: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  cardBody: {
    flexDirection: 'row',
  },
  nameRow: {
    flex: 1,
  },
  nameBlock: {
    flex: 1,
  },
  nameHeader: {
    flexDirection: 'column',
  },
  nameTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indexInline: {
    fontWeight: '800',
    color: '#4F46E5',
  },
  name: {
    fontWeight: '800',
    color: '#111827',
    fontSize: 16,
  },
  nameMeta: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 12,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    color: '#1F2937',
  },
  actionChip: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
  },
  actionText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  passwordLabel: {
    color: '#6B7280',
    fontSize: 12,
  },
  passwordChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
  },
  passwordChipText: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 12,
  },
  passwordValue: {
    color: '#111827',
    fontWeight: '700',
  },
});
