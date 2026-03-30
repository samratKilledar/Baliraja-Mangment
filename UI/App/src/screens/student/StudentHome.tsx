import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import DatePicker from 'react-native-date-picker';
import PushNotification from 'react-native-push-notification';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FastImage from 'react-native-fast-image';
import DashboardScreen from '../../components/DashboardScreen';
import COLORS from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { ANNOUNCEMENTS, subscribePortalStore } from '../../store/studentPortalStore';

const filters = ['attendance', 'performance', 'fees'];
const { width: SCREEN_W } = Dimensions.get('window');
const scaleFont = (size: number) => Math.round((SCREEN_W / 375) * size);
const ATT_LOTTIE = require('../../assets/animations/login-lottie.json');
export type StudentMenu = 'Fees' | 'Profile' | 'Complaint' | 'Leave' | 'Attendance' | 'Performance';

const performanceMonths = [
  { month: 'Nov 2025', subjects: { Math: 78, Science: 74, English: 81, History: 76, Computer: 88 }, note: 'Recovered in English, needs History practice.' },
  { month: 'Dec 2025', subjects: { Math: 82, Science: 78, English: 83, History: 78, Computer: 89 }, note: 'Steady rise across all subjects.' },
  { month: 'Jan 2026', subjects: { Math: 84, Science: 80, English: 85, History: 80, Computer: 90 }, note: 'Maths & CS leading.' },
  { month: 'Feb 2026', subjects: { Math: 85, Science: 82, English: 86, History: 81, Computer: 92 }, note: 'Consistent improvement in Science.' },
  { month: 'Mar 2026', subjects: { Math: 87, Science: 83, English: 87, History: 82, Computer: 93 }, note: 'Best month yet; keep revision going.' }
];
const performanceSubjects = Object.keys(performanceMonths[0].subjects);
const DEFAULT_NOTIFICATION_TIMES = ['10:00', '22:00']; // HH:mm
const REMINDER_IDS = { checkIn: '7001', checkOut: '7002' };

function sectionStyle(menu: StudentMenu) {
  switch (menu) {
    case 'Fees':
      return { backgroundColor: '#f3fff3', borderColor: '#c6eac6' };
    case 'Profile':
      return { backgroundColor: '#f4f7ff', borderColor: '#d8e1ff' };
    case 'Complaint':
      return { backgroundColor: '#fff5f6', borderColor: '#f5c6ce' };
    case 'Leave':
      return { backgroundColor: '#fff9ed', borderColor: '#f7d9a5' };
    case 'Attendance':
      return { backgroundColor: '#f0f5ff', borderColor: '#cddaf8' };
    default:
      return {};
  }
}

type StudentHomeProps = {
  menuOverride?: StudentMenu;
};



export default function StudentHome({ menuOverride }: StudentHomeProps) {
  const { user, token } = useAuth();
  const [loginPhone, setLoginPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fee, setFee] = useState<any | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [cached, setCached] = useState<{ student: any | null; fee: any | null }>({ student: null, fee: null });
  const [attendance, setAttendance] = useState<any | null>(null);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attendanceVisible, setAttendanceVisible] = useState(4);
  const [filter, setFilter] = useState(filters[0]);
  const [perfSubject, setPerfSubject] = useState(performanceSubjects[0]);
  const [perfMonth, setPerfMonth] = useState(performanceMonths[performanceMonths.length - 1].month);
  const activeMenu: StudentMenu = (menuOverride as StudentMenu) || 'Fees';
  const [complaint, setComplaint] = useState('');
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [myComplaints, setMyComplaints] = useState<any[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [leaveTime, setLeaveTime] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [error, setError] = useState('');
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [notificationTimes, setNotificationTimes] = useState<string[]>(DEFAULT_NOTIFICATION_TIMES);
  const [, force] = useState(0);

  const studentId = student?._id || user?.id || 'demo-1001';
  const studentEnrollment = student?.enrollmentNo || '—';
  const studentName = student?.userId?.fullName || 'Student';
  const profileEmail = student?.userId?.email || '—';
  const profilePhone = student?.userId?.phone || '—';
  const profileGender = student?.gender || '—';
  const profileDob = student?.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—';
  const profileGuardian = student?.details?.parent?.guardianName || student?.details?.guardianName || '—';
  const profileGuardianPhone =
    student?.details?.parent?.guardianMobile || student?.details?.guardianMobile || student?.emergencyContact || '—';
  const profileAddress =
    student?.details?.address?.addressLine1 ||
    student?.address ||
    '—';
  const profileAdmission = student?.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '—';
  const profileBatch = student?.batchId?.batchName || '—';

  function pickToday(list: any[]) {
    const todayStr = new Date().toDateString();
    return list.find((a) => new Date(a.date).toDateString() === todayStr) || null;
  }

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, [filter, activeMenu, menuOverride]);

  useEffect(() => {
    const unsub = subscribePortalStore(() => force((v) => v + 1));
    return () => unsub();
  }, []);

  useEffect(() => {
    // create local notification channel
    PushNotification.createChannel(
      {
        channelId: 'attendance-reminders',
        channelName: 'Attendance Reminders'
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('ims_notif_times');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length) {
            setNotificationTimes(parsed as string[]);
          }
        }
      } catch {}
      scheduleNotificationTimes(notificationTimes);
    })();
  }, []);

  useEffect(() => {
    if (activeMenu === 'Complaint') {
      loadMyComplaints().catch(() => {});
    }
    if (activeMenu === 'Leave') {
      loadMyLeaves().catch(() => {});
    }
  }, [activeMenu, token]);


  async function loadMyComplaints() {
    try {
      setComplaintsLoading(true);
      const storedPhone = await AsyncStorage.getItem('ims_bound_mobile');
      const phone = profilePhone || loginPhone || user?.phone || storedPhone || '';
      const params: any = {};
      if (phone) params.phone = phone;
      const config = {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      };
      const { data } = await client.get('/complaints/my', config);
      setMyComplaints(data || []);
    } catch {
      // ignore fetch errors; UI will stay blank
    } finally {
      setComplaintsLoading(false);
    }
  }

  async function loadMyLeaves() {
    try {
      setLeavesLoading(true);
      const storedPhone = await AsyncStorage.getItem('ims_bound_mobile');
      const phone = profilePhone || loginPhone || user?.phone || storedPhone || '';
      const params: any = {};
      if (phone) params.phone = phone;
      const config = {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      };
      const { data } = await client.get('/attendance/my-leaves', config);
      setMyLeaves(data || []);
    } catch {
      // ignore
    } finally {
      setLeavesLoading(false);
    }
  }

  function scheduleNotificationTimes(times: string[]) {
    PushNotification.createChannel(
      {
        channelId: 'attendance-reminders',
        channelName: 'Attendance Reminders',
        soundName: 'army.mp3',
        importance: 4
      },
      () => {}
    );
    times.forEach((t, idx) => {
      const date = parseTimeToNextDate(t);
      if (!date) return;
      const id = idx === 0 ? REMINDER_IDS.checkIn : REMINDER_IDS.checkOut;
      PushNotification.localNotificationSchedule({
        id,
        channelId: 'attendance-reminders',
        title: 'Attendance Reminder',
        message: 'Please complete your attendance action.',
        date,
        allowWhileIdle: true,
        repeatType: 'day',
        soundName: 'army.mp3'
      });
    });
  }

  function parseTimeToNextDate(t: string) {
    const [hh, mm] = t.split(':').map((n) => parseInt(n, 10));
    if (isNaN(hh) || isNaN(mm)) return null;
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    if (d <= new Date()) d.setDate(d.getDate() + 1);
    return d;
  }

  function nextReminder(hour: number, minute: number) {
    const now = new Date();
    const fire = new Date();
    fire.setHours(hour, minute, 0, 0);
    if (fire <= now) {
      // if time passed, remind in 2 minutes today
      return new Date(now.getTime() + 2 * 60 * 1000);
    }
    return fire;
  }

  function updateAttendanceReminders(todayRec?: any) {
    try {
      PushNotification.cancelLocalNotifications({ id: REMINDER_IDS.checkIn });
      PushNotification.cancelLocalNotifications({ id: REMINDER_IDS.checkOut });
    } catch {
      // ignore cancellation issues
    }

    const now = new Date();
    if (!todayRec?.checkInAt) {
      const fire = nextReminder(10, 0);
      PushNotification.localNotificationSchedule({
        id: REMINDER_IDS.checkIn,
        channelId: 'attendance-reminders',
        title: 'Check-In Reminder',
        message: 'Please check in for today.',
        date: fire,
        allowWhileIdle: true
      });
    }
    if (!todayRec?.checkOutAt) {
      const fire = nextReminder(22, 0);
      PushNotification.localNotificationSchedule({
        id: REMINDER_IDS.checkOut,
        channelId: 'attendance-reminders',
        title: 'Check-Out Reminder',
        message: 'Please check out before the day ends.',
        date: fire,
        allowWhileIdle: true
      });
    }
  }

  useEffect(() => {
    (async () => {
      const storedPhone = await AsyncStorage.getItem('ims_bound_mobile');
      // hydrate cached data while network fetch runs
      const [cacheStu, cacheFee] = await Promise.all([
        AsyncStorage.getItem('ims_student_cache'),
        AsyncStorage.getItem('ims_fee_cache')
      ]);
      
      if (cacheStu) {
        const stuObj = JSON.parse(cacheStu);
        setStudent(stuObj);
        setCached((c) => ({ ...c, student: stuObj }));
      }
      if (cacheFee) {
        const feeObj = JSON.parse(cacheFee);
        setFee(feeObj);
        setCached((c) => ({ ...c, fee: feeObj }));
      }
      const phone = storedPhone || user?.phone || null;
      setLoginPhone(phone);
      fetchStudentAndFee(phone);
      refreshAttendance(phone);
    })();
  }, [user?.id]);

  useEffect(() => {
    const today = attendance || pickToday(attendanceList);
    updateAttendanceReminders(today);
  }, [attendance, attendanceList]);

  async function refreshAttendance(phoneOverride?: string | null) {
    const phone = phoneOverride || loginPhone || user?.phone || (user?.id || '').replace('demo-', '');
    const hasJwt = token && !token.startsWith('public-');
    try {
      if (hasJwt) {
        const { data } = await client.get('/attendance/my', { headers: { Authorization: `Bearer ${token}` } });
        setAttendanceList(data || []);
        const today = pickToday(data || []);
        setAttendance(today);
        updateAttendanceReminders(today);
        return;
      }
      if (phone) {
        const { data } = await client.get(`/attendance/public/by-phone/${encodeURIComponent(phone)}`);
        const list = data?.attendance || data || [];
        const today = pickToday(list);
        setAttendanceList(list);
        setAttendance(today);
        updateAttendanceReminders(today);
      }
    } catch (err) {
      // ignore; fallback to existing state
    }
  }

  async function fetchStudentAndFee(phoneOverride?: string | null) {
    setLoading(true);
    const phone = phoneOverride || user?.phone || (user?.id || '').replace('demo-','');
    const hasJwt = token && !token.startsWith('public-');
    try {
      //alert(0)
      if (hasJwt) {
        const [stuRes, feeRes, attRes] = await Promise.all([
          client.get('/students/me', { headers: { Authorization: `Bearer ${token}` } }),
          client.get('/fees/my', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })),
          client.get('/attendance/my', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);
        setStudent(stuRes.data || null);
        setFee(feeRes.data || null);
        const attList = attRes.data || [];
        setAttendanceList(attList);
        const today = pickToday(attList);
        setAttendance(today);
        updateAttendanceReminders(today);
        await AsyncStorage.setItem('ims_student_cache', JSON.stringify(stuRes.data || null));
        await AsyncStorage.setItem('ims_fee_cache', JSON.stringify(feeRes.data || null));
        setError('');
        setLoading(false);
        return;
      }
      if (phone) {
      const { data } = await client.get(`/students/public/by-phone/${encodeURIComponent(phone)}`);
      setStudent(data?.student || null);
      setFee(data?.fee || null);
      const att = data?.attendance || [];
      const today = pickToday(att);
      setAttendanceList(att);
        setAttendance(today);
        updateAttendanceReminders(today);
        setAttendanceVisible(10);
        await AsyncStorage.setItem('ims_student_cache', JSON.stringify(data?.student || null));
        await AsyncStorage.setItem('ims_fee_cache', JSON.stringify(data?.fee || null));
        setError(data?.student ? '' : 'No student found for this mobile number.');
      } else {
        setStudent(null);
        setFee(null);
        setError('No mobile number available to load student.');
      }
    } catch (err: any) {
      // if auth failed, try public lookup using phone
      if (err?.response?.status === 401 && phone) {
        try {
          const { data } = await client.get(`/students/public/by-phone/${encodeURIComponent(phone)}`);
          setStudent(data?.student || null);
          setFee(data?.fee || null);
          setAttendanceList(data?.attendance || []);
          setAttendance(pickToday(data?.attendance || []));
          setAttendanceVisible(10);
          await AsyncStorage.setItem('ims_student_cache', JSON.stringify(data?.student || null));
          await AsyncStorage.setItem('ims_fee_cache', JSON.stringify(data?.fee || null));
          setError(data?.student ? '' : 'No student found for this mobile number.');
          setLoading(false);
          return;
        } catch (e) {
          // continue to cache fallback
        }
      }
      // fall back to cache if present
      if (cached.student || cached.fee) {
        setStudent(cached.student);
        setFee(cached.fee);
        setError('Showing cached data (offline).');
      } else {
        setStudent(null);
        setFee(null);
        setError('Unable to load data. Please check connection and backend.');
      }
    } finally {
      setLoading(false);
    }
  }

  function feesDue() {
    if (!fee) return '—';
    return `₹${fee.dueAmount ?? 0}`;
  }

  function totalFees() {
    if (!fee) return '—';
    return `₹${fee.totalAmount ?? 0}`;
  }

  function paidFees() {
    if (!fee) return '—';
    return `₹${fee.paidAmount ?? 0}`;
  }

  function feeCardStyle() {
    if (!fee) return styles.feeSafe;
    if ((fee.dueAmount ?? 0) > 0) {
      return (fee.paidAmount ?? 0) > 0 ? styles.feeWarn : styles.feeDanger;
    }
    return styles.feeSafe;
  }

  async function handleRefresh() {
    setRefreshing(true);
    const phone = loginPhone || user?.phone || (user?.id || '').replace('demo-', '');
    try {
      await Promise.all([
        fetchStudentAndFee(phone),
        refreshAttendance(phone),
        loadMyComplaints(),
        loadMyLeaves()
      ]);
    } finally {
      setRefreshing(false);
    }
  }
  function parseDateTime(value: string) {
    const normalized = value.replace(' ', 'T');
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function getDurationLabel(fromValue: string, toValue: string) {
    const from = parseDateTime(fromValue);
    const to = parseDateTime(toValue);
    if (!from || !to || to <= from) return '';
    const diffMin = Math.round((to.getTime() - from.getTime()) / 60000);
    if (diffMin < 60) return `${diffMin} min`;
    if (diffMin % 60 === 0) {
      const hours = diffMin / 60;
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hours}h ${mins}m`;
  }

  const totalLabel = fee?.totalAmount ?? 0;
  const paidLabel = fee?.paidAmount ?? 0;
  const dueLabel = fee?.dueAmount ?? (totalLabel - paidLabel);
  const paymentHistory = Array.isArray(fee?.transactions)
    ? [...fee.transactions].sort((a, b) => {
        const aTime = a?.paidOn ? new Date(a.paidOn).getTime() : 0;
        const bTime = b?.paidOn ? new Date(b.paidOn).getTime() : 0;
        return bTime - aTime;
      })
    : [];
  const profileImage = student?.details?.photoUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event?.nativeEvent || {};
    if (!contentOffset || !contentSize || !layoutMeasurement) return;
    const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
    if (nearBottom && attendanceList.length > attendanceVisible) {
      setAttendanceVisible(attendanceList.length);
    }
  };
  const attendanceHeader = (
    <View style={styles.attHeaderBox}>
      <View style={styles.attTopRow}>
        <FastImage source={{ uri: profileImage }} style={styles.avatarSmall} />
          <View style={{ }}>
            <Text style={styles.studentName}>{studentName}</Text>
            <Text style={styles.studentId}>ID: {studentEnrollment}</Text>
          </View>
        </View>
      {/* <View style={{ width: 90, height: 90, marginTop: 8 }}>
        <LottieView source={ATT_LOTTIE} autoPlay loop />
      </View> */}
    </View>
  );

  return (
    <DashboardScreen
      title=""
      subtitle=""
      headerMeta={`Student: ${studentName || user?.fullName || 'Student'}   ID: ${studentEnrollment}`}
      role="student"
      loading={loading}
      loadingLabel="Loading student summary..."
      refreshing={refreshing}
      onRefresh={handleRefresh}
      filter={filter}
      filters={filters}
      onFilterChange={setFilter}
      extraHeader={attendanceHeader}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={[styles.box, sectionStyle(activeMenu)]}>
        

        {activeMenu === 'Fees' ? (
          <View style={[styles.feesCard, fee?.dueAmount > 0 ? (fee?.paidAmount ? styles.feeWarn : styles.feeDanger) : styles.feeSafe]}>
            {error && !loading && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            <Text style={styles.feeTitle}>Fees Summary</Text>
            <View style={styles.feeGrid}>
              <View style={[styles.feeCell, styles.feeCellAccent]}>
                <Text style={styles.feeCellLabel}>Pending</Text>
                <Text style={styles.feeCellValue}>₹{dueLabel}</Text>
              </View>
              <View style={styles.feeCell}>
                <Text style={styles.feeCellLabel}>Paid</Text>
                <Text style={styles.feeCellValue}>₹{paidLabel}</Text>
              </View>
              <View style={styles.feeCell}>
                <Text style={styles.feeCellLabel}>Total</Text>
                <Text style={styles.feeCellValue}>₹{totalLabel}</Text>
              </View>
            </View>
            <View style={styles.feeMetaRow}>
              {fee?.feeStartDate && <Text style={styles.feeMetaText}>From {new Date(fee.feeStartDate).toLocaleDateString()}</Text>}
              {fee?.feeEndDate && <Text style={styles.feeMetaText}>To {new Date(fee.feeEndDate).toLocaleDateString()}</Text>}
              {fee?.dueDate && <Text style={[styles.feeMetaText, { color: '#cf2d2d', fontWeight: '700' }]}>Due {new Date(fee.dueDate).toLocaleDateString()}</Text>}
            </View>
            <View style={{ marginTop: 14 }}>
              <Text style={styles.feeSectionLabel}>Payment History</Text>
              {paymentHistory.length ? (
                paymentHistory.map((p, idx) => (
                  <View key={p?._id || idx} style={styles.payCard}>
                    <View style={styles.payLine}>
                      <Text style={styles.payLabel}>Date</Text>
                      <Text style={styles.payValue}>
                        {p?.paidOn ? new Date(p.paidOn).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                    <View style={styles.payLine}>
                      <Text style={styles.payLabel}>Amount</Text>
                      <Text style={[styles.payValue, { fontWeight: '800' }]}>
                        ₹{Number(p?.amount || 0)}
                      </Text>
                    </View>
                    <View style={styles.payLine}>
                      <Text style={styles.payLabel}>Mode</Text>
                      <Text style={styles.payChip}>{p?.mode || '—'}</Text>
                    </View>
                    {p?.transactionRef ? (
                      <View style={styles.payLine}>
                        <Text style={styles.payLabel}>Reference</Text>
                        <Text style={[styles.payValue, { flexShrink: 1 }]} numberOfLines={2}>
                          {p.transactionRef}
                        </Text>
                      </View>
                    ) : null}
                    {p?.note ? (
                      <View style={styles.payLine}>
                        <Text style={styles.payLabel}>Note</Text>
                        <Text style={[styles.payValue, { flexShrink: 1 }]} numberOfLines={2}>
                          {p.note}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.subtext}>No payments recorded.</Text>
              )}
            </View>
          </View>
          
        ) : null}

        {activeMenu === 'Profile' ? (
          <View style={styles.profileCard}>
            {error && !loading && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            <View style={styles.profileHeader}>
              <FastImage source={{ uri: profileImage }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nameText}>{studentName}</Text>
                <Text style={styles.idText}>ID: {studentEnrollment}</Text>
              </View>
            </View>
            <View style={styles.infoGrid}>
              <InfoRow icon="📧" label="Email" value={profileEmail} />
              <InfoRow icon="📱" label="Mobile" value={profilePhone} />
              <InfoRow icon="⚧" label="Gender" value={profileGender} />
              <InfoRow icon="🎂" label="DOB" value={profileDob} />
              <InfoRow icon="🧑‍🤝‍🧑" label="Guardian" value={profileGuardian} />
              <InfoRow icon="☎️" label="Guardian Mobile" value={profileGuardianPhone} />
              <InfoRow icon="📍" label="Address" value={profileAddress} wide />
              <InfoRow icon="🗓️" label="Admission" value={profileAdmission} />
              <InfoRow icon="🏷️" label="Batch" value={profileBatch} />
            </View>
            <Text style={styles.subtext}>
              Password updates are managed by admin/super admin only.
            </Text>
          </View>
        ) : null}

        {activeMenu === 'Complaint' ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          >
            <TextInput
              placeholder="Write complaint"
              placeholderTextColor="#888"
              value={complaint}
              onChangeText={setComplaint}
              style={styles.input}
            />
            <Pressable
              style={styles.actionBtn}
              onPress={async () => {
                if (!complaint.trim()) return;
                try {
                  const storedPhone = await AsyncStorage.getItem('ims_bound_mobile');
                  const phone = profilePhone || loginPhone || user?.phone || storedPhone || '';
                  await client.post(
                    '/complaints',
                    {
                      studentId,
                      message: complaint.trim(),
                      subject: 'Student Complaint',
                      phone
                    },
                    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
                  );
                  alert('Complaint submitted');
                  setComplaint('');
                  await loadMyComplaints();
                } catch (err) {
                  alert('Unable to submit complaint');
                }
              }}
            >
              <Text style={styles.actionBtnText}>Submit Complaint</Text>
            </Pressable>
            <View style={{ marginTop: 12 }}>
              <Pressable
                style={[styles.actionBtn, { marginBottom: 8, backgroundColor: '#e6f0ff' }]}
                onPress={() => loadMyComplaints()}
              >
                <Text style={[styles.actionBtnText, { color: '#1f2f75' }]}>Refresh Complaints</Text>
              </Pressable>
              {complaintsLoading ? <Text style={styles.subtext}>Loading complaints...</Text> : null}
              {!complaintsLoading && myComplaints.length === 0 ? (
                <Text style={styles.subtext}>No complaints yet.</Text>
              ) : null}
              {myComplaints.map((c) => (
                <View
                  key={c._id}
                  style={[
                    styles.complaintCard,
                    c.status === 'done'
                      ? { backgroundColor: '#e5f7e9', borderColor: '#b7e4c2' }
                      : c.status === 'wip'
                        ? { backgroundColor: '#fff4d6', borderColor: '#f3d9a5' }
                        : { backgroundColor: '#ffecec', borderColor: '#f1b6b6' }
                  ]}
                >
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                    <Text style={styles.complaintSubject}>{c.subject || 'Complaint'}</Text>
                    <Text style={[styles.statusPill, c.status === 'done' ? styles.statusDone : c.status === 'wip' ? styles.statusWip : styles.statusOpen]}>
                      {c.status?.toUpperCase?.() || 'OPEN'}
                    </Text>
                  </View>
                  <Text style={styles.subtext}>{c.message}</Text>
                  <Text style={styles.subtext}>Raised: {c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}</Text>
                  <Text style={styles.subtext}>Phone: {c.phone || profilePhone}</Text>
                  {c.adminNote ? <Text style={[styles.subtext, { marginTop:4 }]}>Admin note: {c.adminNote}</Text> : null}
                  <Pressable
                    style={[styles.actionBtn, { marginTop: 8, backgroundColor: '#ffe6e6' }]}
                    onPress={async () => {
                      try {
                        await client.delete(`/complaints/${c._id}`, {
                          params: { phone: profilePhone || loginPhone || (user?.phone ?? '') },
                          headers: token ? { Authorization: `Bearer ${token}` } : undefined
                        });
                        await loadMyComplaints();
                      } catch {
                        alert('Unable to delete complaint');
                      }
                    }}
                  >
                    <Text style={[styles.actionBtnText, { color: '#c0392b' }]}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </KeyboardAvoidingView>
        ) : null}

        {activeMenu === 'Performance' ? (
          <View style={styles.performanceCard}>
            <Text style={styles.heading}>Performance Graph</Text>
            <Text style={styles.subtext}>Monthly subject scores. Same snapshot is visible to parents and teachers.</Text>
            <View style={styles.perfChipRow}>
              {performanceSubjects.map((subject) => (
                <Pressable
                  key={subject}
                  style={[styles.chip, perfSubject === subject && styles.chipActive]}
                  onPress={() => setPerfSubject(subject)}
                >
                  <Text style={[styles.chipText, perfSubject === subject && styles.chipTextActive]}>{subject}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.perfMonthRow}>
              {performanceMonths.map((m) => (
                <Pressable
                  key={m.month}
                  style={[styles.monthCard, perfMonth === m.month && styles.monthCardActive]}
                  onPress={() => setPerfMonth(m.month)}
                >
                  <Text style={styles.monthLabel}>{m.month}</Text>
                  <Text style={styles.monthValue}>{m.subjects[perfSubject]}%</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.perfBars}>
              {performanceMonths.map((m) => (
                <View key={m.month} style={styles.perfBarItem}>
                  <View style={styles.perfBarTrack}>
                    <View style={[styles.perfBarFill, { height: `${m.subjects[perfSubject]}%` }]} />
                  </View>
                  <Text style={styles.perfBarLabel}>{m.month.split(' ')[0]}</Text>
                  <Text style={styles.perfBarScore}>{m.subjects[perfSubject]}%</Text>
                </View>
              ))}
            </View>

            <View style={styles.perfSummaryRow}>
              <View style={styles.perfSummaryCard}>
                <Text style={styles.subtext}>Latest ({perfMonth})</Text>
                <Text style={styles.perfSummaryValue}>
                  {(performanceMonths.find((m) => m.month === perfMonth) || performanceMonths[performanceMonths.length - 1]).subjects[perfSubject]}%
                </Text>
              </View>
              <View style={styles.perfSummaryCard}>
                <Text style={styles.subtext}>Average</Text>
                <Text style={styles.perfSummaryValue}>
                  {Math.round(
                    performanceMonths.reduce((acc, m) => acc + (m.subjects[perfSubject] || 0), 0) / performanceMonths.length
                  )}%
                </Text>
              </View>
            </View>
            <Text style={styles.subtext}>
              {(performanceMonths.find((m) => m.month === perfMonth) || performanceMonths[performanceMonths.length - 1]).note}
            </Text>
          </View>
        ) : null}

        {activeMenu === 'Attendance' ? (
          <>
            <View style={styles.attendancePanel}>
              <Text style={[styles.heading, { marginBottom: 6 }]}>Attendance (last 30 days)</Text>
              <View style={styles.attLegend}>
                <LegendDot colorStyle={styles.calFull} label="Present (in/out)" />
                <LegendDot colorStyle={styles.calIn} label="Checked-in only" />
                <LegendDot colorStyle={styles.calLeaveApproved} label="Leave approved" />
                <LegendDot colorStyle={styles.calLeavePending} label="Leave pending" />
                <LegendDot colorStyle={styles.calMiss} label="Missed" />
              </View>
            {error && !loading ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
            {attendanceList.length ? (
              <>
                {renderMobileCalendar(attendanceList.slice(0, attendanceVisible))}
                <View style={{ marginTop: 10 }}>
                  {attendanceList.slice(0, attendanceVisible).map((a) => (
                  <View key={a._id || a.date} style={styles.attRowItem}>
                    <Text style={styles.subtext}>
                      {new Date(a.date).toLocaleDateString()} — In: {a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString() : '—'} / Out:{' '}
                      {a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString() : '—'}
                    </Text>
                 </View>
               ))}
              </View>
            </>
          ) : (
            <Text style={styles.subtext}>No attendance records found.</Text>
            )}
            </View>
          </>
        ) : null}

        {activeMenu === 'Leave' ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 100}
            style={{ flex: 1 }}
          >
          <View style={styles.leavePanel}>
            <Text style={[styles.subtext, { marginTop: 10, fontWeight: '700' }]}>Apply for Leave</Text>
            <Pressable
              style={styles.input}
              onPress={() => setShowFromPicker(true)}
            >
              <Text style={{ color: fromDate ? '#1f2f75' : '#888' }}>{fromDate || 'Select From Date'}</Text>
            </Pressable>
            <Pressable
              style={styles.input}
              onPress={() => setShowToPicker(true)}
            >
              <Text style={{ color: toDate ? '#1f2f75' : '#888' }}>{toDate || 'Select To Date'}</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="Time (e.g., Full Day, Half Day)"
              placeholderTextColor="#888"
              onChangeText={setLeaveTime}
              value={leaveTime}
            />
            <DatePicker
              modal
              open={showFromPicker}
              date={fromDate ? new Date(fromDate) : new Date()}
              mode="date"
              onConfirm={(selectedDate) => {
                setShowFromPicker(false);
                setFromDate(selectedDate.toISOString().slice(0, 10));
              }}
              onCancel={() => setShowFromPicker(false)}
            />
            <DatePicker
              modal
              open={showToPicker}
              date={toDate ? new Date(toDate) : new Date()}
              mode="date"
              onConfirm={(selectedDate) => {
                setShowToPicker(false);
                setToDate(selectedDate.toISOString().slice(0, 10));
              }}
              onCancel={() => setShowToPicker(false)}
            />
            <TextInput
              style={styles.input}
              placeholder="Reason for leave"
              placeholderTextColor="#888"
              onChangeText={setLeaveReason}
              value={leaveReason}
              multiline
            />
            <Pressable
              style={styles.actionBtn}
              onPress={async () => {
                if (!fromDate || !leaveReason) {
                  alert('From date and reason are required');
                  return;
                }
                const leaveType = toDate && toDate !== fromDate
                  ? 'multi_day'
                  : (leaveTime?.toLowerCase().includes('hour') ? 'short' : 'full_day');
                try {
                  const storedPhone = await AsyncStorage.getItem('ims_bound_mobile');
                  const phone = profilePhone || loginPhone || user?.phone || storedPhone || '';
                  await client.post('/attendance/leave', {
                    studentId,
                    leaveFrom: fromDate,
                    leaveTo: toDate || fromDate,
                    leaveReason,
                    leaveType,
                    phone
                  });
                  alert('Leave request submitted');
                  await loadMyLeaves();
                  setFromDate('');
                  setToDate('');
                  setLeaveTime('');
                  setLeaveReason('');
                } catch (err) {
                  alert('Unable to submit leave');
                }
              }}
            >
              <Text style={styles.actionBtnText}>Submit Leave Request</Text>
            </Pressable>

            <Text style={[styles.subtext, { marginTop: 10, fontWeight: '700' }]}>Applied Leaves</Text>
            <Pressable style={[styles.actionBtn, { marginBottom: 8, backgroundColor: '#e6f0ff' }]} onPress={() => loadMyLeaves()}>
              <Text style={[styles.actionBtnText, { color: '#1f2f75' }]}>Refresh Leaves</Text>
            </Pressable>
            <View style={styles.attLegend}>
              <LegendDot colorStyle={{ backgroundColor:'#e5f7e9', borderColor:'#b7e4c2' }} label="Approved" />
              <LegendDot colorStyle={{ backgroundColor:'#fff4d6', borderColor:'#f3d9a5' }} label="Pending" />
              <LegendDot colorStyle={{ backgroundColor:'#ffecec', borderColor:'#f1b6b6' }} label="Rejected" />
            </View>
            {leavesLoading ? <Text style={styles.subtext}>Loading leaves...</Text> : null}
            {!leavesLoading && !myLeaves.length ? <Text style={styles.subtext}>No leaves yet.</Text> : null}
            {myLeaves.map((item) => (
              <View
                key={item._id || item.id}
                style={[
                  styles.leaveRow,
                  item.leaveStatus === 'approved'
                    ? { backgroundColor: '#e5f7e9', borderColor: '#b7e4c2' }
                    : { backgroundColor: '#fff4d6', borderColor: '#f3d9a5' }
                ]}
              >
                <Text style={styles.subtext}>
                  From: {item.leaveFrom ? item.leaveFrom.substring(0,10) : item.from} To: {item.leaveTo ? item.leaveTo.substring(0,10) : item.to}
                </Text>
                <Text style={styles.subtext}>Reason: {item.leaveReason || item.reason}</Text>
              <Text style={[styles.subtext, { fontWeight: 'bold' }]}>Status: {(item.leaveStatus || item.status || 'requested').toUpperCase()}</Text>
              </View>
            ))}
          </View>
          </KeyboardAvoidingView>
        ) : null}

      </View>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#d7dff6',
    borderRadius: 12,
    backgroundColor: '#f9fbff',
    padding: 12
  },
  feesCard: {
    width: '100%',
    alignSelf: 'stretch',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe5f6'
  },
  feeWarn: { backgroundColor: '#fff7e6', borderColor: '#f7d7a1' },
  feeDanger: { backgroundColor: '#ffecec', borderColor: '#f1b6b6' },
  feeSafe: { backgroundColor: '#f3fff3', borderColor: '#bfe6bf' },
  announcementBox: {
    marginTop: 0,
    marginHorizontal: -16,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingTop: 0
  },
  heading: {
    color: '#1f2f75',
    fontWeight: '800',
    fontSize: scaleFont(16)
  },
  subtext: {
    marginTop: 6,
    color: '#5e688f',
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18)
  },
  feeTitle: {
    color: '#1f2f75',
    fontWeight: '800',
    fontSize: scaleFont(15)
  },
  feeGrid: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8
  },
  feeCell: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe4f6',
    backgroundColor: '#f7f9ff'
  },
  feeCellAccent: { backgroundColor: '#ffecec', borderColor: '#f3c6c6' },
  feeCellLabel: { color: '#6b7392', fontSize: scaleFont(12) },
  feeCellValue: { color: '#1f2f75', fontSize: scaleFont(18), fontWeight: '800' },
  feeMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  feeMetaText: { color: '#4a557a', fontSize: scaleFont(12) },
  feeSectionLabel: { marginTop: 6, color: '#1f2f75', fontWeight: '700', fontSize: scaleFont(13) },
  errorText: {
    color: COLORS.danger,
    fontWeight: '700',
    marginBottom: 6
  },
  banner: {
    marginTop: 8,
    width: '100%',
    height: 180,
    borderRadius: 0
  },
  descriptionText: {
    marginTop: 6,
    color: '#5e688f',
    paddingHorizontal: 12,
    fontSize: scaleFont(14)
  },
  profileRow: {
    marginTop: 10,
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 10
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2fb',
    paddingVertical: 8,
    alignItems: 'center'
  },
  payText: { color: '#4a557a', fontSize: scaleFont(12) },
  payChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#eef2fb',
    color: '#1f2f75',
    fontSize: scaleFont(11),
    overflow: 'hidden'
  },
  payCard: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eef2fb',
    borderRadius: 12,
    backgroundColor: '#fbfcff',
    gap: 6
  },
  payLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  payLabel: { color: '#6b7392', fontSize: scaleFont(12) },
  payValue: { color: '#1f2f75', fontSize: scaleFont(13) },
  input: {
    marginTop: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#d8dff6',
    borderRadius: 10,
    padding: 10,
    backgroundColor: COLORS.white,
    fontSize: scaleFont(14)
  },
  row: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8
  },
  actionBtn: {
    marginTop: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#cad6fb',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#edf2ff'
  },
  actionBtnText: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  calendar: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayText: {
    color: '#2f3d74',
    fontWeight: '700',
    fontSize: 12
  },
  leaveRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dfe5f6',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff'
  },
  attRowItem: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e7ecf7',
    borderRadius: 12,
    backgroundColor: '#fbfcff'
  },
  attRow: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  attBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfe5f6',
    alignItems: 'center'
  },
  attBtnText: { fontWeight: '700', color: '#1f2f75', fontSize: scaleFont(12) },
  attHeader: {
    flexDirection: 'row',
    //gap: 12,
    alignItems: 'center',
    marginBottom: 4
  },
  attTitle: { fontSize: scaleFont(16), fontWeight: '800', color: '#1f2f75' },
  attSub: { fontSize: scaleFont(13), color: '#5e688f', marginTop: 4 },
  profileCard: {
    marginTop: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#dfe5f6',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
    gap: 10
  },
  profileHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  nameText: { fontSize: scaleFont(16), fontWeight: '800', color: '#1f2f75' },
  idText: { fontSize: scaleFont(12), color: '#6b7489' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoItem: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#edf1fb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f9fbff'
  },
  infoItemWide: {
    width: '100%'
  },
  infoLabel: { fontSize: scaleFont(12), color: '#5e688f', marginBottom: 4 },
  infoValue: { fontSize: scaleFont(14), color: '#1f2f75', fontWeight: '700' },
  mobileCalendar: {
    marginTop: 10,
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#f9fbff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6ebfb'
  },
  calCell: {
    width: '30%',
    minWidth: 96,
    borderWidth: 1,
    borderColor: '#e6ebfb',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff'
  },
  calFull: { backgroundColor: '#e8f8f0', borderColor: '#c8eedc' },
  calIn: { backgroundColor: '#fff7e6', borderColor: '#f3d9a5' },
  calLeavePending: { backgroundColor: '#fff4d6', borderColor: '#f3d9a5' },
  calLeaveApproved: { backgroundColor: '#e5f7e9', borderColor: '#b7e4c2' },
  calMiss: { backgroundColor: '#ffecec', borderColor: '#f1b6b6' },
  calToday: { borderWidth: 2, borderColor: '#1f3ca8' },
  calDate: { fontWeight: '800', color: '#1f2f75', fontSize: scaleFont(14) },
  calTime: { fontSize: scaleFont(12), color: '#6c7595', marginTop: 4 },
  attendancePanel: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6ebfb',
    backgroundColor: '#fbfcff',
    gap: 6
  },
  leavePanel: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6ebfb',
    backgroundColor: '#fbfcff',
    gap: 6
  },
  attLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    marginBottom: 8
  },
  attLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6ebfb'
  },
    attHeaderBox: {
  backgroundColor: "#ffffff",
  borderRadius: 10,
  paddingVertical: 4,
  paddingHorizontal: 8,
  marginBottom: 2,

  // Border
  borderWidth: 1,
  borderColor: "#e4e8f3",

  // iOS Shadow
  shadowColor: "red",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,

  // Android Shadow
  elevation: 4
},

attTopRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 2  // ↓ reduced
},

avatarSmall: {
  width: 40,   // ↓ reduced
  height: 40,  // ↓ reduced
  borderRadius: 6,
  marginRight: 8
},

studentName: {
  fontSize: scaleFont(15),
  fontWeight: "800",
  color: "#1f2f75"
},

timeRow: {
  flexDirection: "row",
  marginTop: 4,
  gap: 12
},

timeText: {
  fontSize: scaleFont(13),
  fontWeight: "600",
  color: "#5e688f"
},

btnRow: {
  flexDirection: "row",
  gap: 6
},

checkInBtn: {
  flex: 1,
  backgroundColor: "#e2f7ea",
  paddingVertical: 6,  // ↓ reduced
  borderRadius: 8,
  alignItems: "center"
},

checkOutBtn: {
  flex: 1,
  backgroundColor: "#ffe6e6",
  paddingVertical: 6,  // ↓ reduced
  borderRadius: 8,
  alignItems: "center"
},

btnText: {
  fontWeight: "700",
  color: "#1f2f75"
},
  timeValue: {
    fontSize: scaleFont(13),
    fontWeight: "700",
    color: "#1f2f75"
  },
  complaintCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#dfe5f6',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff'
  },
  complaintSubject: {
    fontWeight: '800',
    color: '#22316a'
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '800',
    fontSize: scaleFont(12)
  },
  statusOpen: { backgroundColor: '#ffecec', color: '#c0392b' },
  statusWip: { backgroundColor: '#fff7e6', color: '#c27b20' },
  statusDone: { backgroundColor: '#e8f8f0', color: '#0f7d49' },
  performanceCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e6f7',
    backgroundColor: '#fbfcff',
    gap: 8
  },
  perfChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfe4f6',
    backgroundColor: '#f7f9ff'
  },
  chipActive: { borderColor: '#1f3ca8', backgroundColor: '#e7eeff' },
  chipText: { color: '#1f2f75', fontWeight: '700' },
  chipTextActive: { color: '#1f3ca8' },
  perfMonthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  monthCard: {
    flexBasis: '48%',
    borderWidth: 1,
    borderColor: '#e1e6f7',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff'
  },
  monthCardActive: { borderColor: '#1f3ca8', backgroundColor: '#f1f4ff' },
  monthLabel: { color: '#4a557a', fontSize: scaleFont(12) },
  monthValue: { color: '#1f2f75', fontWeight: '800', fontSize: scaleFont(16) },
  perfBars: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6
  },
  perfBarItem: { alignItems: 'center', flex: 1 },
  perfBarTrack: {
    width: '100%',
    height: 130,
    borderWidth: 1,
    borderColor: '#e1e6f7',
    borderRadius: 10,
    backgroundColor: '#f9fbff',
    justifyContent: 'flex-end',
    overflow: 'hidden'
  },
  perfBarFill: { width: '100%', backgroundColor: '#3c5bdb' },
  perfBarLabel: { marginTop: 4, color: '#5e688f', fontSize: scaleFont(12) },
  perfBarScore: { color: '#1f2f75', fontWeight: '800' },
  perfSummaryRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  perfSummaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e6f7',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fbfcff'
  },
  perfSummaryValue: { color: '#1f2f75', fontWeight: '800', fontSize: scaleFont(18) },
  timeMissing: {
    color: "#e53935"
  },
});

function LegendDot({ colorStyle, label }: { colorStyle: any; label: string }) {
  return (
    <View style={styles.attLegendItem}>
      <View style={[styles.attLegendDot, colorStyle]} />
      <Text style={styles.subtext}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, wide = false }: { icon: string; label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.infoItem, wide && styles.infoItemWide]}>
      <Text style={styles.infoLabel}>
        {icon} {label}
      </Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

  function renderMobileCalendar(data: any[]) {
    const now = new Date();
    now.setHours(0,0,0,0);
    const days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const map: Record<string, any> = {};
  data.forEach((a) => {
    const key = new Date(a.date).toDateString();
    map[key] = a;
  });
  return (
    <View style={styles.mobileCalendar}>
      {days.map((d) => {
        const rec = map[d.toDateString()];
        const status = rec
          ? rec.status === 'leave'
            ? (rec.leaveStatus === 'approved' ? styles.calLeaveApproved : styles.calLeavePending)
            : (rec.checkOutAt ? styles.calFull : styles.calIn)
          : styles.calMiss;
        const isToday = d.getTime() === now.getTime();
        return (
          <View key={d.toISOString()} style={[styles.calCell, status, isToday && styles.calToday]}>
            <Text style={styles.calDate}>{d.getDate()}</Text>
            <Text style={styles.calTime}>
              {rec?.checkInAt ? new Date(rec.checkInAt).toLocaleTimeString() : '—'} /{' '}
              {rec?.checkOutAt ? new Date(rec.checkOutAt).toLocaleTimeString() : '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
