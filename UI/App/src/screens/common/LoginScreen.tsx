import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Easing,
  ImageBackground,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import {useAuth} from '../../context/AuthContext';
import {useLanguage} from '../../context/LanguageContext';
import COLORS from '../../config/colors';
import LoadingOverlay from '../../components/LoadingOverlay';
import {tx} from '../../i18n/strings';
import client from '../../api/client';

const BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80';
const LOGIN_LOTTIE = require('../../assets/animations/login-lottie.json');

export default function LoginScreen() {
  const {setSession} = useAuth();
  const {language, setLanguage} = useLanguage();
  const t = tx(language);
  const {width} = useWindowDimensions();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const fadeIn = useRef(new Animated.Value(0)).current;
  const liftIn = useRef(new Animated.Value(20)).current;
  const trimmedIdentifier = identifier.trim();
  const mobileDigits = trimmedIdentifier.replace(/\D/g, '');
  const isEmailLogin = trimmedIdentifier.includes('@');
  const canSubmit =
    (mobileDigits.length === 10 || isEmailLogin) &&
    password.length >= 6 &&
    !loading;
  const lottieHeight = Math.max(160, Math.min(240, width * 0.45));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(liftIn, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, liftIn]);

  async function handleLogin() {
    if (!isEmailLogin && mobileDigits.length !== 10) {
      Alert.alert(
        t.invalidNumberTitle,
        'Enter a valid 10-digit mobile number or email address.',
      );
      return;
    }

    try {
      setLoading(true);
      setLoginError('');
      const {data} = await client.post('/auth/login', {
        identifier: isEmailLogin
          ? trimmedIdentifier.toLowerCase()
          : mobileDigits,
        password,
      });
      setSession(data.token, data.user);
      await AsyncStorage.setItem(
        'ims_bound_mobile',
        isEmailLogin ? data.user?.phone || '' : mobileDigits,
      );
    } catch (err: any) {
      setLoginError(
        err?.response?.data?.message ||
          'Unable to login. Please contact admin.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground
      source={{uri: BACKGROUND_IMAGE}}
      resizeMode="cover"
      style={styles.bgImage}>
      <View style={styles.bgOverlay} />
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
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeIn,
                  transform: [{translateY: liftIn}],
                },
              ]}>
              <View style={styles.langRow}>
                <Text style={styles.langLabel}>{t.languageLabel}</Text>
                <View style={styles.langSwitch}>
                  <Pressable
                    onPress={() => setLanguage('en')}
                    style={[
                      styles.langChip,
                      language === 'en' && styles.langChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.langChipText,
                        language === 'en' && styles.langChipTextActive,
                      ]}>
                      EN
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setLanguage('mr')}
                    style={[
                      styles.langChip,
                      language === 'mr' && styles.langChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.langChipText,
                        language === 'mr' && styles.langChipTextActive,
                      ]}>
                      मराठी
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.brand}>{t.appName}</Text>
              <Text style={styles.title}>{t.loginTitle}</Text>
              <Text style={styles.subtitle}>{t.loginSubtitle}</Text>

              <View style={[styles.lottieBox, {height: lottieHeight}]}>
                <LottieView
                  source={LOGIN_LOTTIE}
                  autoPlay
                  loop
                  style={styles.lottie}
                />
              </View>

              <View style={styles.form}>
                <TextInput
                  placeholder="Mobile number or email"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={60}
                  value={identifier}
                  onChangeText={setIdentifier}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                />
                {loginError ? (
                  <Text style={styles.errorText}>{loginError}</Text>
                ) : null}
                <Pressable
                  disabled={!canSubmit}
                  onPress={handleLogin}
                  style={({pressed}) => [
                    styles.button,
                    !canSubmit && styles.buttonDisabled,
                    pressed && canSubmit && styles.buttonPressed,
                  ]}>
                  <Text style={styles.buttonText}>{t.sendOtp}</Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        <LoadingOverlay visible={loading} label={t.signingIn} />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 18, 45, 0.28)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'transparent',
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
    width: 320,
    height: 320,
    borderRadius: 40,
    transform: [{rotate: '-18deg'}],
    backgroundColor: '#1f3698',
    top: -190,
    right: -130,
    opacity: 0.55,
  },
  bgShapeBottom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 34,
    transform: [{rotate: '-14deg'}],
    backgroundColor: '#54a57c',
    bottom: -180,
    left: -140,
    opacity: 0.16,
  },
  bgStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 170,
    backgroundColor: '#223a92',
    opacity: 0.14,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d7def4',
    padding: 20,
    shadowColor: '#162656',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 5,
  },
  lottieBox: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f4f7ff',
    borderWidth: 1,
    borderColor: '#dfe6fa',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langLabel: {
    color: '#5a6791',
    fontWeight: '700',
  },
  langSwitch: {
    flexDirection: 'row',
    gap: 8,
  },
  langChip: {
    borderWidth: 1,
    borderColor: '#cad4f7',
    backgroundColor: '#f8f9ff',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  langChipActive: {
    borderColor: '#2944ad',
    backgroundColor: '#e6edff',
  },
  langChipText: {
    color: '#40508b',
    fontWeight: '600',
  },
  langChipTextActive: {
    color: '#243a9c',
    fontWeight: '800',
  },
  brand: {
    marginTop: 12,
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.2,
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2a5a',
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.textGray,
  },
  form: {
    marginTop: 14,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    padding: 13,
    borderRadius: 12,
    borderColor: '#dbe2f7',
    backgroundColor: '#f9fbff',
    color: COLORS.textDark,
  },
  button: {
    marginTop: 4,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#8d98bf',
  },
  buttonPressed: {
    transform: [{scale: 0.98}],
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 4,
    color: COLORS.danger,
    fontWeight: '600',
  },
});
