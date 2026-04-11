import React, {useMemo} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import COLORS from '../../config/colors';
import TYPOGRAPHY from '../../config/typography';
import {useAuth} from '../../context/AuthContext';
import PasswordChangeCard from '../../components/PasswordChangeCard';

export default function ForcePasswordChangeScreen() {
  const {user, updateUser} = useAuth();
  const {width} = useWindowDimensions();
  const styles = useMemo(() => createStyles(width), [width]);

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
            <Text style={styles.title}>Update Your Password</Text>
            <Text style={styles.subtitle}>
              Your account is using the initial password set by admin. Please
              change it to continue.
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
        </ScrollView>
      </KeyboardAvoidingView>
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
      color: COLORS.textDark,
      fontSize: titleSize,
      fontWeight: '800',
    },
    subtitle: {
      marginTop: 8,
      color: COLORS.textGray,
      fontSize: subtitleSize,
      lineHeight: TYPOGRAPHY.lineHeight.body,
    },
  });
};
