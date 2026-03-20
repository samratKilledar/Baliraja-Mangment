import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, PermissionsAndroid, Platform, ToastAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import DashboardScreen from '../../components/DashboardScreen';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

export default function TeacherHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [today, setToday] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [calendarDays, setCalendarDays] = useState<{ date: Date; status: 'present' | 'absent' | 'leave' }[]>([]);

  useEffect(() => {
    fetchAttendance();
  }, [user?.phone]);

  async function fetchAttendance() {
    if (!user?.phone) return;
    setLoading(true);
    try {
      const { data } = await client.get(`/attendance/public/by-phone/${user.phone}`);
      const list = data?.attendance || data || [];
      setAttendance(list);
      const todayStr = new Date().toDateString();
      setToday(list.find((r: any) => new Date(r.date).toDateString() === todayStr) || null);
      setCalendarDays(buildCalendar(list));
      setError('');
    } catch (err: any) {
      setAttendance([]);
      setCalendarDays([]);
      const msg = err?.response?.data?.message || 'Unable to load attendance';
      setError(msg);
      notify(msg);
    } finally {
      setLoading(false);
    }
  }

  function buildCalendar(list: any[]) {
    const days: { date: Date; status: 'present' | 'absent' | 'leave' }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const rec = list.find((r) => new Date(r.date).toDateString() === d.toDateString());
      let status: 'present' | 'absent' | 'leave' = 'absent';
      if (rec?.status === 'leave' || rec?.isOnLeave) status = 'leave';
      else if (rec?.checkInAt || rec?.checkOutAt || rec?.status === 'present') status = 'present';
      days.push({ date: d, status });
    }
    return days.reverse(); // oldest to newest for grid ordering
  }

  async function getLocation() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return null;
      }
      return await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        Geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
        );
      });
    } catch {
      return null;
    }
  }

  async function mark(action: 'check-in' | 'check-out') {
    try {
      const loc = await getLocation();
      await client.post(`/attendance/public/${action === 'check-in' ? 'check-in' : 'check-out'}`, { phone: user?.phone, location: loc });
      fetchAttendance();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Unable to update attendance';
      setError(msg);
      notify(msg);
    }
  }

  function notify(message: string) {
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Teacher: ${message}`, ToastAndroid.LONG);
    }
  }

  const headerExtra = (
    <View style={styles.headerBox}>
      <Text style={styles.heading}>Attendance (Today)</Text>
      <View style={styles.headerRow}>
        <Text style={styles.timeLabel}>IN:</Text>
        <Text style={[styles.timeValue, !today?.checkInAt && styles.timeMissing]}>
          {today?.checkInAt ? new Date(today.checkInAt).toLocaleTimeString() : 'Not Yet'}
        </Text>
        <Text style={[styles.timeLabel, { marginLeft: 12 }]}>OUT:</Text>
        <Text style={[styles.timeValue, !today?.checkOutAt && styles.timeMissing]}>
          {today?.checkOutAt ? new Date(today.checkOutAt).toLocaleTimeString() : 'Not Yet'}
        </Text>
      </View>
      <View style={styles.row}>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#e3f7ff' }]} onPress={() => mark('check-in')}>
          <Text style={styles.actionBtnText}>📍 Check In</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#ffe9e3' }]} onPress={() => mark('check-out')}>
          <Text style={styles.actionBtnText}>🏁 Check Out</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <DashboardScreen
      title="Teacher Attendance"
      subtitle="Mark your in/out and review recent logs"
      role="teacher"
      loading={loading}
      loadingLabel="Syncing attendance..."
      filter=""
      filters={[]}
      onFilterChange={() => {}}
      extraHeader={headerExtra}
    >
      <View style={styles.box}>
        <Text style={styles.heading}>Recent Attendance</Text>
        <FlatList
          data={attendance.slice(0, 20)}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.rowItem}>
              <Text style={styles.subtext}>{new Date(item.date).toLocaleDateString()}</Text>
              <Text style={styles.subtext}>In: {item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString() : '--'}</Text>
              <Text style={styles.subtext}>Out: {item.checkOutAt ? new Date(item.checkOutAt).toLocaleTimeString() : '--'}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.subtext}>No records</Text>}
        />
      </View>

      <View style={styles.box}>
        <Text style={styles.heading}>Last 30 Days</Text>
        <View style={styles.legendRow}>
          <Legend color="#d1f2d6" label="Present" />
          <Legend color="#ffe0e0" label="Absent" />
          <Legend color="#fff4d6" label="Leave" />
        </View>
        <View style={styles.calendarGrid}>
          {calendarDays.map((d, idx) => {
            const bg =
              d.status === 'present' ? '#d1f2d6' : d.status === 'leave' ? '#fff4d6' : '#ffe0e0';
            const border = d.status === 'present' ? '#43a047' : d.status === 'leave' ? '#f6c344' : '#e53935';
            return (
              <View key={idx} style={[styles.dayCell, { backgroundColor: bg, borderColor: border }]}>
                <Text style={styles.dayText}>{d.date.getDate()}</Text>
                <Text style={styles.daySub}>{d.date.toLocaleDateString(undefined, { weekday: 'short' })}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </DashboardScreen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: color, borderWidth: 1, borderColor: '#c6cce0' }} />
      <Text style={{ color: '#5e688f', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d7dff6',
    borderRadius: 12,
    backgroundColor: '#f9fbff',
    padding: 12
  },
  heading: { color: '#1f2f75', fontWeight: '800' },
  subtext: { marginTop: 5, color: '#5e688f' },
  error: { color: '#c0392b', marginTop: 4 },
  row: { marginTop: 10, flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cad6fb',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#edf2ff'
  },
  actionBtnText: { color: '#1f3ca8', fontWeight: '700' },
  rowItem: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eef2fb' },
  headerBox: {
    marginTop: 4,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e8f3',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  timeLabel: { fontSize: 13, fontWeight: '700', color: '#5e688f' },
  timeValue: { marginLeft: 4, fontSize: 14, fontWeight: '800', color: '#1f2f75' },
  timeMissing: { color: '#e53935' },
  legendRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  calendarGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dayCell: {
    width: '14%',
    minWidth: 44,
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  dayText: { fontWeight: '800', color: '#1f2f75', fontSize: 14 },
  daySub: { color: '#5e688f', fontSize: 11 }
});
