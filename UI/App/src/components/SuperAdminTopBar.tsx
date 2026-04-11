import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
export default function SuperAdminTopBar() {
  const {user, logout} = useAuth();
  const roleLabel = 'Admin';
  const displayName = user?.fullName?.trim() || roleLabel;

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.loginAsText}>Login as Admin</Text>
        <Text style={styles.roleText}>{`${roleLabel}: ${displayName}`}</Text>
        <Text style={styles.orgText}>
          Baliraja Academy Gangapur Management
        </Text>
      </View>
      <Pressable
        onPress={logout}
        style={styles.logoutBtn}
        android_ripple={{color: '#CBD5F5'}}>
        <MaterialCommunityIcons name="logout" size={18} color="#1D4ED8" />
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
  textBlock: {
    flex: 1,
    paddingRight: 8,
  },
  loginAsText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  roleText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  orgText: {
    marginTop: 2,
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
});
