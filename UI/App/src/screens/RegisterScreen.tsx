import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import client from '../api/client';
import COLORS from '../config/colors';
import LoadingOverlay from '../components/LoadingOverlay';

const roles = ['student', 'parent', 'teacher', 'admin'];

export default function RegisterScreen() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      await client.post('/auth/register', form);
      Alert.alert('Success', 'User registered. Please login.');
    } catch (err: any) {
      Alert.alert('Registration Failed', err?.response?.data?.message || 'Unable to register');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: COLORS.background }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16, color: COLORS.primary }}>Create Account</Text>
      <View style={{ gap: 12 }}>
        <TextInput placeholder="Full Name" placeholderTextColor={COLORS.textMuted} value={form.fullName} onChangeText={(v) => setForm({ ...form, fullName: v })} style={{ borderWidth: 1, padding: 12, borderRadius: 8, borderColor: COLORS.border, backgroundColor: COLORS.white, color: COLORS.textDark }} />
        <TextInput placeholder="Email" placeholderTextColor={COLORS.textMuted} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} style={{ borderWidth: 1, padding: 12, borderRadius: 8, borderColor: COLORS.border, backgroundColor: COLORS.white, color: COLORS.textDark }} />
        <TextInput placeholder="Password" placeholderTextColor={COLORS.textMuted} secureTextEntry value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} style={{ borderWidth: 1, padding: 12, borderRadius: 8, borderColor: COLORS.border, backgroundColor: COLORS.white, color: COLORS.textDark }} />
        <Text style={{ fontWeight: '600', color: COLORS.text }}>Role</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {roles.map((role) => {
            const selected = form.role === role;
            return (
              <Pressable
                key={role}
                onPress={() => setForm({ ...form, role })}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: selected ? COLORS.primary : COLORS.borderLight,
                  backgroundColor: selected ? COLORS.light : COLORS.white
                }}
              >
                <Text style={{ textTransform: 'capitalize', color: COLORS.textDark }}>{role}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          disabled={loading}
          onPress={handleRegister}
          style={{
            paddingVertical: 12,
            borderRadius: 8,
            backgroundColor: loading ? COLORS.textMuted : COLORS.primary,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: COLORS.white, fontWeight: '700' }}>{loading ? 'Creating account...' : 'Register'}</Text>
        </Pressable>
      </View>
      <LoadingOverlay visible={loading} label="Registering account..." />
    </SafeAreaView>
  );
}
