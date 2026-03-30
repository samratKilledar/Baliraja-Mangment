import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import DashboardScreen from '../../components/DashboardScreen';
import {useAuth} from '../../context/AuthContext';
import PasswordChangeCard from '../../components/PasswordChangeCard';
import client from '../../api/client';

export default function TeacherProfile() {
  const {user, updateUser} = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      if (!user) return;
      const {data} = await client.get('/users/me');
      if (data) {
        updateUser({
          ...(user || {}),
          ...data,
        });
      }
    } catch {
      // silent refresh fail
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <DashboardScreen
      title="Profile"
      subtitle="Your personal information"
      role="teacher"
      loading={false}
      loadingLabel=""
      refreshing={refreshing}
      onRefresh={handleRefresh}
      filter=""
      filters={[]}
      onFilterChange={() => {}}>
      <View style={styles.box}>
        <Text style={styles.heading}>{user?.fullName || 'Teacher'}</Text>
        <Text style={styles.subtext}>Phone: {user?.phone || '—'}</Text>
        <Text style={styles.subtext}>Email: {user?.email || '—'}</Text>
        <Text style={styles.subtext}>Role: {user?.role}</Text>
      </View>
      <PasswordChangeCard
        title="Update Password"
        subtitle="This updates your app login password and syncs it back to the web panel."
        onSuccess={updatedUser => {
          if (user) {
            updateUser({
              ...user,
              ...(updatedUser || {}),
              mustChangePassword: false,
            });
          }
        }}
      />
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d7dff6',
    borderRadius: 12,
    backgroundColor: '#f9fbff',
  },
  heading: {color: '#1f2f75', fontWeight: '800', fontSize: 18},
  subtext: {marginTop: 6, color: '#5e688f'},
});
