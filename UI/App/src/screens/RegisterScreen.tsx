import React, {useMemo, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import client from '../api/client';
import COLORS from '../config/colors';
import TYPOGRAPHY from '../config/typography';
import LoadingOverlay from '../components/LoadingOverlay';

const roles = ['student', 'parent', 'teacher', 'admin'];

export default function RegisterScreen() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const {width} = useWindowDimensions();
  const styles = useMemo(() => createStyles(width), [width]);

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
    <SafeAreaView style={styles.container}>
      <View style={styles.bgShapeTop} />
      <View style={styles.bgShapeBottom} />
      <View style={styles.bgStripe} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Add your details and choose a role to get started.
            </Text>

            <View style={styles.form}>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={COLORS.textMuted}
                value={form.fullName}
                onChangeText={v => setForm({...form, fullName: v})}
                style={styles.input}
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={v => setForm({...form, email: v})}
                style={styles.input}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                value={form.password}
                onChangeText={v => setForm({...form, password: v})}
                style={styles.input}
              />

              <Text style={styles.sectionLabel}>Role</Text>
              <View style={styles.roleWrap}>
                {roles.map(role => {
                  const selected = form.role === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() => setForm({...form, role})}
                      style={[
                        styles.roleChip,
                        selected && styles.roleChipActive,
                      ]}>
                      <Text
                        style={[
                          styles.roleText,
                          selected && styles.roleTextActive,
                        ]}>
                        {role}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                disabled={loading}
                onPress={handleRegister}
                style={({pressed}) => [
                  styles.button,
                  loading && styles.buttonDisabled,
                  pressed && !loading && styles.buttonPressed,
                ]}>
                <Text style={styles.buttonText}>
                  {loading ? 'Creating account...' : 'Register'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay visible={loading} label="Registering account..." />
    </SafeAreaView>
  );
}

const createStyles = (width: number) => {
  const titleSize = Math.max(22, Math.min(30, width * 0.07));
  const subtitleSize = Math.max(14, Math.min(17, width * 0.042));
  const cardPadding = width < 360 ? 16 : 20;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      padding: 16,
    },
    keyboardContainer: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    bgShapeTop: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 40,
      transform: [{rotate: '-16deg'}],
      backgroundColor: COLORS.primary,
      top: -170,
      right: -120,
      opacity: 0.45,
    },
    bgShapeBottom: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 34,
      transform: [{rotate: '-14deg'}],
      backgroundColor: COLORS.primaryLight,
      bottom: -160,
      left: -130,
      opacity: 0.18,
    },
    bgStripe: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 170,
      backgroundColor: COLORS.primary,
      opacity: 0.12,
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: cardPadding,
      maxWidth: 440,
      alignSelf: 'center',
      shadowColor: COLORS.primaryLight,
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: {width: 0, height: 10},
      elevation: 5,
    },
    title: {
      fontSize: titleSize,
      fontWeight: '800',
      color: COLORS.textDark,
    },
    subtitle: {
      marginTop: 6,
      fontSize: subtitleSize,
      color: COLORS.textGray,
      lineHeight: TYPOGRAPHY.lineHeight.body,
    },
    form: {
      marginTop: 16,
      gap: 12,
    },
    input: {
      borderWidth: 1,
      padding: 13,
      borderRadius: 12,
      borderColor: COLORS.border,
      backgroundColor: COLORS.white,
      color: COLORS.textDark,
      fontSize: TYPOGRAPHY.android.body,
      lineHeight: TYPOGRAPHY.lineHeight.body,
    },
    sectionLabel: {
      marginTop: 4,
      fontWeight: '700',
      color: COLORS.text,
      fontSize: TYPOGRAPHY.android.support,
    },
    roleWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    roleChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.borderLight,
      backgroundColor: COLORS.white,
    },
    roleChipActive: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.light,
    },
    roleText: {
      textTransform: 'capitalize',
      color: COLORS.textDark,
      fontWeight: '600',
      fontSize: TYPOGRAPHY.android.support,
    },
    roleTextActive: {
      color: COLORS.primary,
      fontWeight: '700',
    },
    button: {
      marginTop: 8,
      borderRadius: 12,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    buttonDisabled: {
      backgroundColor: COLORS.primaryLight,
    },
    buttonPressed: {
      transform: [{scale: 0.98}],
      backgroundColor: COLORS.primaryLight,
    },
    buttonText: {
      color: COLORS.white,
      fontWeight: TYPOGRAPHY.button.fontWeight,
      fontSize: TYPOGRAPHY.android.button,
      letterSpacing: TYPOGRAPHY.button.letterSpacing,
    },
  });
};
