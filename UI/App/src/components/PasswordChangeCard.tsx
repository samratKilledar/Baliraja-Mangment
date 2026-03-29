import React, {useState} from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import client from '../api/client';
import COLORS from '../config/colors';

type PasswordChangeCardProps = {
  title?: string;
  subtitle?: string;
  onSuccess?: (updatedUser?: any) => void;
};

export default function PasswordChangeCard({
  title = 'Password',
  subtitle = 'Update your login password here.',
  onSuccess,
}: PasswordChangeCardProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(
        'Weak password',
        'New password must be at least 6 characters.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirm password must match.');
      return;
    }

    try {
      setLoading(true);
      const {data} = await client.put('/users/me/password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.(data?.user);
      Alert.alert('Success', 'Password updated successfully.');
    } catch (err: any) {
      Alert.alert(
        'Unable to update',
        err?.response?.data?.message ||
          'Please check your current password and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.subtext}>{subtitle}</Text>

      <TextInput
        placeholder="Current password"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
        style={styles.input}
      />
      <TextInput
        placeholder="New password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        style={styles.input}
      />
      <TextInput
        placeholder="Confirm new password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? 'Updating...' : 'Update Password'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7dff6',
  },
  heading: {
    color: COLORS.textDark,
    fontWeight: '800',
    fontSize: 17,
  },
  subtext: {
    color: COLORS.textGray,
    marginTop: 4,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7dff6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fbff',
    marginBottom: 10,
    color: COLORS.textDark,
  },
  button: {
    marginTop: 4,
    backgroundColor: '#1f3ca8',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },
});
