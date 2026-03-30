import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAuth} from '../context/AuthContext';

export default function SuperAdminTopBar() {
  const {clearSession, user} = useAuth();

  return (
    <View style={styles.row}>
      <Text style={styles.roleText}>
        Super Admin: {user?.fullName || 'Super Admin'}
      </Text>
      <Pressable
        onPress={clearSession}
        style={({pressed}) => [
          styles.logoutButton,
          pressed && styles.logoutButtonPressed,
        ]}>
        <Text style={styles.logoutText}>⏻ Logout</Text>
      </Pressable>
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
  logoutButton: {
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutButtonPressed: {
    opacity: 0.82,
  },
  logoutText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '800',
  },
});
