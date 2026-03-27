import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {useAuth} from '../../context/AuthContext';
import PasswordChangeCard from '../../components/PasswordChangeCard';

export default function ForcePasswordChangeScreen() {
  const {user, updateUser} = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Update Your Password</Text>
        <Text style={styles.subtitle}>
          Your account is using the initial password set by admin. Please change
          it to continue.
        </Text>
        <PasswordChangeCard
          title="Set New Password"
          subtitle="Enter your current login password first, then set a new one."
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef3ff',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d7dff6',
    padding: 16,
  },
  title: {
    color: '#1f2f75',
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: '#5e688f',
  },
});
