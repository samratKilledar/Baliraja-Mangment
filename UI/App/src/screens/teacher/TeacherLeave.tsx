import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, Platform, ToastAndroid } from 'react-native';
import DatePicker from 'react-native-date-picker';
import DashboardScreen from '../../components/DashboardScreen';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

type LeaveItem = {
  _id: string;
  leaveFrom?: string;
  leaveTo?: string;
  leaveReason?: string;
  leaveStatus?: 'approved' | 'rejected' | 'requested';
  leaveType?: string;
};

const STATUS_COLORS: Record<string, string> = {
  approved: '#0f7d49',
  rejected: '#c0392b',
  requested: '#c27b20'
};

export default function TeacherLeave() {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [type, setType] = useState('full_day');
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaves();
  }, [user?.phone]);

  async function loadLeaves() {
    if (!user?.phone) return;
    setLoading(true);
    try {
      const { data } = await client.get('/attendance/my-leaves', { params: { phone: user.phone } });
      setLeaves(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: any) {
      setLeaves([]);
      const msg = err?.response?.data?.message || 'Unable to load leaves';
      setError(msg);
      notify(msg);
    } finally {
      setLoading(false);
    }
  }

  async function submitLeave() {
    if (!fromDate || !reason.trim()) {
      setError('Please select from date and add reason');
      return;
    }
    try {
      const payload = {
        phone: user?.phone,
        leaveFrom: fromDate,
        leaveTo: toDate || fromDate,
        leaveReason: reason.trim(),
        leaveType: type
      };
      await client.post('/attendance/leave', payload);
      setError('');
      setFromDate(null);
      setToDate(null);
      setReason('');
      loadLeaves();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Unable to submit leave';
      setError(msg);
      notify(msg);
    }
  }

  function renderDates(item: LeaveItem) {
    const from = item.leaveFrom ? new Date(item.leaveFrom) : null;
    const to = item.leaveTo ? new Date(item.leaveTo) : null;
    if (!from) return '—';
    if (!to || from.toDateString() === to.toDateString()) return from.toLocaleDateString();
    return `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;
  }

  function notify(message: string) {
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Teacher: ${message}`, ToastAndroid.LONG);
    }
  }

  return (
    <DashboardScreen
      title="Leave"
      subtitle="Apply leave; admin will approve"
      role="teacher"
      loading={loading}
      loadingLabel="Loading leave data..."
      filter=""
      filters={[]}
      onFilterChange={() => {}}
    >
      <View style={styles.box}>
        <Text style={styles.heading}>Apply Leave</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.input} onPress={() => setOpenFrom(true)}>
          <Text style={styles.inputText}>{fromDate ? fromDate.toLocaleDateString() : 'From date'}</Text>
        </Pressable>
        <Pressable style={styles.input} onPress={() => setOpenTo(true)}>
          <Text style={styles.inputText}>{toDate ? toDate.toLocaleDateString() : 'To date (optional)'}</Text>
        </Pressable>
        <TextInput
          placeholder="Leave type (full_day / half_day)"
          value={type}
          onChangeText={setType}
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Reason"
          value={reason}
          onChangeText={setReason}
          style={[styles.input, { height: 70 }]}
          multiline
        />
        <Pressable style={styles.button} onPress={submitLeave}>
          <Text style={styles.buttonText}>Submit</Text>
        </Pressable>
      </View>

      <View style={styles.box}>
        <Text style={styles.heading}>My Leave Requests</Text>
        <FlatList
          data={leaves}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const status = (item.leaveStatus || 'requested').toLowerCase();
            const color = STATUS_COLORS[status] || '#c27b20';
            return (
              <View style={styles.leaveRow}>
                <Text style={styles.subtext}>{renderDates(item)}</Text>
                <Text style={styles.subtext}>Reason: {item.leaveReason || '—'}</Text>
                <Text style={[styles.status, { color }]}>{status.toUpperCase()}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.subtext}>No leaves yet.</Text>}
        />
      </View>

      <DatePicker
        modal
        mode="date"
        open={openFrom}
        date={fromDate || new Date()}
        onConfirm={(d) => {
          setOpenFrom(false);
          setFromDate(d);
          if (!toDate) setToDate(d);
        }}
        onCancel={() => setOpenFrom(false)}
      />
      <DatePicker
        modal
        mode="date"
        open={openTo}
        date={toDate || fromDate || new Date()}
        onConfirm={(d) => {
          setOpenTo(false);
          setToDate(d);
        }}
        onCancel={() => setOpenTo(false)}
      />
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#d7dff6', borderRadius: 12, backgroundColor: '#f9fbff' },
  heading: { color: '#1f2f75', fontWeight: '800' },
  subtext: { marginTop: 4, color: '#5e688f' },
  error: { color: '#c0392b', marginTop: 6 },
  input: { marginTop: 8, borderWidth: 1, borderColor: '#dfe4f6', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  inputText: { color: '#1f2f75' },
  button: {
    marginTop: 10,
    backgroundColor: '#1f3ca8',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '800' },
  leaveRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef2fb' },
  status: { marginTop: 4, fontWeight: '800' }
});
