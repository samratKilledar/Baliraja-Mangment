import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import MovingSchoolBanner from '../../components/MovingSchoolBanner';
import SuperAdminTopBar from '../../components/SuperAdminTopBar';
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

const LOGO_IMAGE = require('../../assets/splash-default.png');
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

export default function SuperAdminStudentList() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [feesByStudent, setFeesByStudent] = useState<Record<string, FeeRow>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [freshPasswords, setFreshPasswords] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const loadStudents = useCallback(async (
    query = '',
    nextPage = 1,
    isRefresh = false,
    append = false,
  ) => {
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
      const nextItems = Array.isArray(studentData?.items) ? studentData.items : [];
      setStudents(prev =>
        append ? [...prev, ...nextItems] : nextItems,
      );
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
      setError(err?.response?.data?.message || 'Unable to load student list.');
      if (!append) {
        setStudents([]);
        setFeesByStudent({});
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadStudents(search.trim(), page);
  }, [loadStudents]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadStudents(search.trim(), 1);
    }, 350);
    return () => clearTimeout(handler);
  }, [loadStudents, search]);

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
        ListHeaderComponent={
          <View>
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
          </View>
        }
        renderItem={({item: student, index}) => (
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <View style={styles.nameRow}>
                {/* <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" /> */}
                <View style={styles.nameBlock}>
                  <View style={styles.nameHeader}>
                    <View style={styles.nameTopRow}>
                      <Text style={styles.indexInline}>{index + 1}.</Text>
                      <Text style={styles.name}>
                        {student.userId?.fullName || 'Student'}
                      </Text>
                    </View>
                    <Text style={styles.nameMeta}>
                      Age: {student.age ?? '—'} | Gender: {student.gender || '—'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <IconBadge
                      name="card-account-details"
                      color="#1D4ED8"
                      background="#DBEAFE"
                    />
                    <Text style={styles.metaBold}>
                      Enroll: {student.enrollmentNo || '—'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.detailGrid}>
                <View style={styles.detailCol}>
                  <View style={styles.metaRow}>
                    <IconBadge
                      name="phone"
                      color="#15803D"
                      background="#DCFCE7"
                    />
                    <Text style={styles.meta}>
                      Phone: {student.userId?.phone || '—'}
                    </Text>
                      {student.userId?.phone ? (
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${student.userId?.phone}`)}
                      style={styles.callBtn}>
                      <MaterialCommunityIcons name="phone" size={14} color="#4338CA" />
                      
                    </Pressable>
                  ) : null}
                  </View>
                
                  <View style={styles.metaRow}>
                    <IconBadge
                      name="email"
                      color="#6D28D9"
                      background="#EDE9FE"
                    />
                    <Text style={styles.meta}>
                      Email: {student.userId?.email || '—'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.feeTable}>
                <View style={styles.feeHeaderRow}>
                  <Text style={styles.feeHeaderCell}>Total Fees</Text>
                  <Text style={styles.feeHeaderCell}>Paid</Text>
                  <Text style={styles.feeHeaderCell}>Remaining</Text>
                </View>
                <View style={styles.feeValueRow}>
                  <Text style={styles.feeValueCell}>
                    ₹{(feesByStudent[student._id]?.totalAmount || 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.feeValueCell, styles.feePaid]}>
                    ₹{(feesByStudent[student._id]?.paidAmount || 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.feeValueCell, styles.feePending]}>
                    ₹{(feesByStudent[student._id]?.dueAmount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
              <View style={styles.passwordRow}>
                <Text style={styles.password}>
                  Password:{' '}
                  {showPasswords[student.userId?._id || '']
                    ? (freshPasswords[student.userId?._id || ''] ||
                      student.userId?.passwordVisible ||
                      '123456')
                    : '••••••••'}
                </Text>
                <Pressable
                  onPress={() =>
                    setShowPasswords(prev => ({
                      ...prev,
                      [student.userId?._id || '']: !prev[student.userId?._id || ''],
                    }))
                  }
                  style={styles.eyeBtn}>
                  <Text style={styles.eyeBtnText}>
                    {showPasswords[student.userId?._id || ''] ? 'Hide' : 'Show password'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        onEndReached={() => {
          if (!loadingMore && !loading && page < totalPages) {
            loadStudents(search.trim(), page + 1, false, true);
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color="#2563EB"
              style={styles.loaderMore}
            />
          ) : null
        }
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  loaderMore: {
    marginTop: 12,
    marginBottom: 12,
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
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  cardBody: {
    flex: 1,
  },
  name: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  nameHeader: {
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomColor: '#E5E7EB',
    marginBottom: 6,
  },
  nameTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indexInline: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 12,
  },
  nameMeta: {
    marginTop: 2,
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameBlock: {
    flex: 1,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#DDE3F8',
  },
  metaRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailGrid: {
    marginTop: 6,
    width: '100%',
  },
  detailCol: {
    width: '100%',
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  phoneRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  callBtn: {
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  callText: {
    color: '#4338CA',
    fontWeight: '700',
    fontSize: 11,
  },
  feeTable: {
    marginTop: 8,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  feeHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
  },
  feeHeaderCell: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 6,
    color: '#4338CA',
    fontSize: 10,
    fontWeight: '800',
  },
  feeValueRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  feeValueCell: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 8,
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  feePaid: {
    color: '#15803D',
  },
  feePending: {
    color: '#B91C1C',
  },
  meta: {
    color: '#4B5563',
    fontSize: 12,
  },
  metaBold: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  password: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },
  passwordRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyeBtn: {
    borderWidth: 1,
    borderColor: '#B7A8CF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F2ECFA',
  },
  eyeBtnText: {
    color: '#1F1233',
    fontWeight: '700',
    fontSize: 12,
  },
});
