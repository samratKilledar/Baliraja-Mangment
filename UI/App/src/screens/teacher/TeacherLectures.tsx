import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View, Pressable, Platform, ToastAndroid } from 'react-native';
import DatePicker from 'react-native-date-picker';
import DashboardScreen from '../../components/DashboardScreen';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import COLORS from '../../config/colors';

export default function TeacherLectures() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lectures, setLectures] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [displayList, setDisplayList] = useState<any[]>([]);
  const [startPicker, setStartPicker] = useState(false);
  const [endPicker, setEndPicker] = useState(false);

  useEffect(() => {
    fetchLectures(true);
  }, [user?.phone]);

  async function fetchLectures(reset = false) {
    if (!user?.id) return;
    if (reset) setPage(0);
    setLoading(true);
    try {
      const limit = 50;
      const skip = reset ? 0 : page * limit;
      const { data } = await client.get(`/teachers/public/${user.id}/lectures`, { params: { limit, skip } }).catch(() => ({ data: { logs: [] } }));
      const list = data?.logs || data || [];
      const next = reset ? list : [...lectures, ...list];
      setLectures(next);
      setDisplayList(buildDisplay(next));
      setPage(reset ? 1 : page + 1);
      setError('');
    } catch (err: any) {
      if (reset) {
        setLectures([]);
        setDisplayList([]);
      }
      const msg = 'Unable to load lectures';
      setError(msg);
      notify(msg);
    } finally {
      setLoading(false);
    }
  }

  async function addLecture() {
    if (!user?.id || !subject.trim()) {
      setError('Subject is required');
      return;
    }
    try {
      const day = new Date().toISOString().slice(0, 10);
      const startIso = startTime ? `${day}T${startTime}` : undefined;
      const endIso = endTime ? `${day}T${endTime}` : undefined;
      const payload: any = { subject: subject.trim(), studentCount: Number(studentCount) || 0, startTime: startIso, endTime: endIso, note };
      await client.post(`/teachers/public/${user.id}/lectures`, payload);
      setSubject('');
      setStudentCount('');
      setStartTime('');
      setEndTime('');
      setNote('');
      fetchLectures(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Unable to add lecture';
      setError(msg);
      notify(msg);
    }
  }

  function buildDisplay(list: any[]) {
    const sorted = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const rows: any[] = [];
    let lastDay = '';
    sorted.forEach((item) => {
      const day = item.date ? new Date(item.date).toDateString() : 'Unknown';
      if (day !== lastDay) {
        rows.push({ type: 'header', day });
        lastDay = day;
      }
      rows.push({ type: 'item', ...item });
    });
    return rows;
  }

  function notify(message: string) {
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Teacher: ${message}`, ToastAndroid.LONG);
    }
  }

  function renderHours(item: any) {
    if (item.hours || item.hours === 0) return item.hours;
    if (item.startTime && item.endTime) {
      const start = new Date(item.startTime);
      const end = new Date(item.endTime);
      const h = (end.getTime() - start.getTime()) / 3600000;
      if (!Number.isNaN(h) && h >= 0) return Number(h.toFixed(1));
    }
    return '--';
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetchLectures(true);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <DashboardScreen
      title={`Lectures — ${user?.fullName || 'Teacher'}`}
      subtitle="What you teach and headcount"
      role="teacher"
      loading={loading}
      loadingLabel="Loading lectures..."
      refreshing={refreshing}
      onRefresh={handleRefresh}
      filter=""
      filters={[]}
      onFilterChange={() => {}}
    >
      <View style={styles.box}>
        <Text style={styles.heading}>Add Lecture</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput placeholder="Subject" placeholderTextColor={COLORS.textMuted} value={subject} onChangeText={setSubject} style={styles.input} />
        <TextInput placeholder="Student count" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" value={studentCount} onChangeText={setStudentCount} style={styles.input} />
        <Pressable style={styles.input} onPress={() => setStartPicker(true)}>
          <Text style={{ color: startTime ? '#1f2f75' : '#888' }}>{startTime || 'Pick start time'}</Text>
        </Pressable>
        <Pressable style={styles.input} onPress={() => setEndPicker(true)}>
          <Text style={{ color: endTime ? '#1f2f75' : '#888' }}>{endTime || 'Pick end time'}</Text>
        </Pressable>
        <TextInput placeholder="Note" placeholderTextColor={COLORS.textMuted} value={note} onChangeText={setNote} style={styles.input} />
        <Pressable style={styles.button} onPress={addLecture}>
          <Text style={styles.buttonText}>Save Lecture</Text>
        </Pressable>
      </View>

      <View style={styles.box}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <FlatList
          data={displayList}
          keyExtractor={(item, idx) => item.type === 'header' ? `h-${item.day}-${idx}` : item._id || item.id || String(idx)}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>{item.day}</Text>
                </View>
              );
            }
            return (
              <View style={styles.rowItem}>
                <Text style={styles.heading}>{item.date ? new Date(item.date).toLocaleDateString() : '—'}</Text>
                <Text style={styles.subtext}>Subject: {item.subject || '—'}</Text>
                <Text style={styles.subtext}>Students: {item.studentCount ?? item.count ?? 0}</Text>
                <Text style={styles.subtext}>
                  Time: {(item.startTime && new Date(item.startTime).toLocaleTimeString()) || '--'} -
                  {(item.endTime && new Date(item.endTime).toLocaleTimeString()) || '--'}
                </Text>
                <Text style={styles.subtext}>Hours: {renderHours(item)}</Text>
                <Text style={styles.subtext}>Note: {item.note || '—'}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.subtext}>No lecture logs found.</Text>}
          onEndReached={() => fetchLectures(false)}
          onEndReachedThreshold={0.5}
        />
      </View>

      <DatePicker
        modal
        mode="time"
        open={startPicker}
        date={new Date()}
        onConfirm={(d) => {
          setStartPicker(false);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          setStartTime(`${hh}:${mm}`);
        }}
        onCancel={() => setStartPicker(false)}
      />
      <DatePicker
        modal
        mode="time"
        open={endPicker}
        date={new Date()}
        onConfirm={(d) => {
          setEndPicker(false);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          setEndTime(`${hh}:${mm}`);
        }}
        onCancel={() => setEndPicker(false)}
      />
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#d7dff6', borderRadius: 12, backgroundColor: '#f9fbff' },
  heading: { color: '#1f2f75', fontWeight: '800' },
  subtext: { marginTop: 4, color: '#5e688f' },
  rowItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef2fb' },
  error: { color: '#c0392b', marginBottom: 6 },
  input: { marginTop: 8, borderWidth: 1, borderColor: '#dfe4f6', borderRadius: 10, padding: 10, backgroundColor: '#fff', color: '#1f2f75' },
  button: {
    marginTop: 10,
    backgroundColor: '#1f3ca8',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '800' }
});
