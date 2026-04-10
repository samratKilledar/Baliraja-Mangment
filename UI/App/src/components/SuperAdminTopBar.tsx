import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useAuth} from '../context/AuthContext';

export default function SuperAdminTopBar() {
  const {user} = useAuth();

  return (
    <View style={styles.row}>
      <Text style={styles.roleText}>
        Super Admin: {user?.fullName || 'Super Admin'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  roleText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
