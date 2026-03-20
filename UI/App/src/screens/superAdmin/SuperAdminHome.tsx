import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DashboardScreen from '../../components/DashboardScreen';
import {
  getSuperAdminStaffSummaryRows,
  subscribePortalStore
} from '../../store/studentPortalStore';

const filters = ['today', 'this week', 'this month'];

export default function SuperAdminHome() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(filters[0]);
  const [staffRows, setStaffRows] = useState(getSuperAdminStaffSummaryRows());

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, [filter]);

  useEffect(() => {
    const unsub = subscribePortalStore(() => {
      setStaffRows(getSuperAdminStaffSummaryRows());
    });
    return () => unsub();
  }, []);

  const totalPresent = staffRows.reduce((sum, item) => sum + item.presentDays, 0);
  const totalAbsent = staffRows.reduce((sum, item) => sum + item.absentDays, 0);

  return (
    <DashboardScreen
      title="Super Admin Dashboard"
      subtitle="Staff records, working days, present/absent tracking."
      role="super_admin"
      loading={loading}
      loadingLabel="Loading institute analytics..."
      filter={filter}
      filters={filters}
      onFilterChange={setFilter}
    >
      <View style={styles.box}>
        <Text style={styles.heading}>Staff Attendance Summary</Text>
        <Text style={styles.subtext}>Total Staff: {staffRows.length}</Text>
        <Text style={styles.subtext}>Combined Present Days: {totalPresent}</Text>
        <Text style={styles.subtext}>Combined Absent Days: {totalAbsent}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.heading}>Staff Working Record</Text>
        {staffRows.map((item) => (
          <View key={item.staffId} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.staffName} ({item.designation})</Text>
              <Text style={styles.subtext}>Subject: {item.subject}</Text>
              <Text style={styles.subtext}>Working Days: {item.workingDays}</Text>
              <Text style={[styles.subtext, { color: '#0f7d49', fontWeight: '700' }]}>Present Days: {item.presentDays}</Text>
              <Text style={[styles.subtext, { color: '#cf2d2d', fontWeight: '700' }]}>Absent Days: {item.absentDays}</Text>
              <Text style={styles.subtext}>Check-in: {item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString() : '--'}</Text>
              <Text style={styles.subtext}>Check-out: {item.checkOutAt ? new Date(item.checkOutAt).toLocaleTimeString() : '--'}</Text>
            </View>
            <Text style={[styles.status, { color: item.checkInAt && !item.checkOutAt ? '#0f7d49' : '#cf2d2d' }]}>
              {item.checkInAt && !item.checkOutAt ? 'Present Today' : 'Absent/Out Today'}
            </Text>
          </View>
        ))}
      </View>
    </DashboardScreen>
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
  heading: {
    color: '#1f2f75',
    fontWeight: '800'
  },
  row: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#dfe5f6',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff'
  },
  name: {
    color: '#22316a',
    fontWeight: '700'
  },
  subtext: {
    marginTop: 2,
    color: '#5e688f'
  },
  status: {
    fontWeight: '800'
  }
});
