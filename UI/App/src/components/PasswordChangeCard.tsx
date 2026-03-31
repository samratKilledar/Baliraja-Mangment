import React, {useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import client from '../api/client';
import COLORS from '../config/colors';
import TYPOGRAPHY from '../config/typography';

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
  const successScale = useRef(new Animated.Value(1)).current;

  function playSuccessBounce() {
    Animated.sequence([
      Animated.timing(successScale, {
        toValue: 1.05,
        duration: 140,
        easing: Easing.bezier(...TYPOGRAPHY.motion.easing),
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        tension: 90,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }

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
      playSuccessBounce();
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
    <Animated.View style={[styles.card, {transform: [{scale: successScale}]}]}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.subtext}>{subtitle}</Text>

      <TextInput
        placeholder="Current password"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
        style={styles.input}
      />
      <TextInput
        placeholder="New password"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        style={styles.input}
      />
      <TextInput
        placeholder="Confirm new password"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        android_ripple={{color: TYPOGRAPHY.motion.rippleColor}}>
        <Text style={styles.buttonText}>
          {loading ? 'Updating...' : 'Update Password'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primaryLight,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  heading: {
    color: COLORS.textDark,
    fontWeight: '800',
    fontSize: TYPOGRAPHY.android.h2,
  },
  subtext: {
    color: COLORS.textGray,
    marginTop: 4,
    marginBottom: 12,
    fontSize: TYPOGRAPHY.android.support,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    marginBottom: 10,
    color: COLORS.textDark,
    fontSize: TYPOGRAPHY.android.body,
    lineHeight: TYPOGRAPHY.lineHeight.body,
  },
  button: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: TYPOGRAPHY.button.fontWeight,
    fontSize: TYPOGRAPHY.android.button,
    letterSpacing: TYPOGRAPHY.button.letterSpacing,
  },
});
