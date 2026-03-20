import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DashboardScreen from '../../components/DashboardScreen';
import { useAuth } from '../../context/AuthContext';

export default function TeacherProfile() {
  const { user } = useAuth();
  return (
    <DashboardScreen
      title="Profile"
      subtitle="Your personal information"
      role="teacher"
      loading={false}
      loadingLabel=""
      filter=""
      filters={[]}
      onFilterChange={() => {}}
    >
      <View style={styles.box}>
        <Text style={styles.heading}>{user?.fullName || 'Teacher'}</Text>
        <Text style={styles.subtext}>Phone: {user?.phone || '—'}</Text>
        <Text style={styles.subtext}>Email: {user?.email || '—'}</Text>
        <Text style={styles.subtext}>Role: {user?.role}</Text>
      </View>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#d7dff6', borderRadius: 12, backgroundColor: '#f9fbff' },
  heading: { color: '#1f2f75', fontWeight: '800', fontSize: 18 },
  subtext: { marginTop: 6, color: '#5e688f' }
});
