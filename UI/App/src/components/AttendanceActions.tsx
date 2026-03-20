import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import client from '../api/client';

type Props = {
  studentId?: string; // optional, backend will derive from token if student role
  batchId?: string;
};

export default function AttendanceActions({ studentId, batchId }: Props) {
  const [loading, setLoading] = useState(false);

  async function call(endpoint: string) {
    setLoading(true);
    try {
      const payload: any = { studentId, batchId };
      const { data } = await client.post(endpoint, payload);
      Alert.alert('Success', `${endpoint} recorded at ${new Date(data.checkInAt || data.checkOutAt || data.date).toLocaleString()}`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity style={[styles.btn, loading && styles.disabled]} disabled={loading} onPress={() => call('/attendance/check-in')}>
        <Text style={styles.btnText}>{loading ? 'Please wait...' : 'Check In'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, loading && styles.disabled]} disabled={loading} onPress={() => call('/attendance/check-out')}>
        <Text style={styles.btnText}>{loading ? 'Please wait...' : 'Check Out'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginVertical: 10 },
  btn: {
    flex: 1,
    backgroundColor: '#2344b2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  disabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700' }
});
