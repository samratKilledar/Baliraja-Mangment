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
import TYPOGRAPHY from '../../config/typography';
import LoadingOverlay from '../../components/LoadingOverlay';
import {tx} from '../../i18n/strings';
import client from '../../api/client';

const TRAINING_IMAGES = [
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80',
];
const FUTURE_LINES = {
  en: [
    'Future of students changes with every login.',
    'Training today builds leaders for tomorrow.',
    'Learn skills. Build confidence. Change your future.',
  ],
  mr: [
    'प्रत्येक लॉगिनसोबत विद्यार्थ्यांचे भविष्य बदलते.',
    'आजचे प्रशिक्षण उद्याचे नेतृत्व घडवते.',
    'कौशल्य, आत्मविश्वास आणि उज्ज्वल भविष्य इथून सुरू होते.',
  ],
};
const LOGIN_LOTTIE = require('../../assets/animations/login-lottie.json');
const EMPHASIZED_EASING = Easing.bezier(...TYPOGRAPHY.motion.easing);

export default function LoginScreen() {
  const {setSession} = useAuth();
  const {language, setLanguage} = useLanguage();
  const t = tx(language);
  const {width} = useWindowDimensions();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const [futureIndex, setFutureIndex] = useState(0);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const liftIn = useRef(new Animated.Value(20)).current;
  const trimmedIdentifier = identifier.trim();
  const mobileDigits = trimmedIdentifier.replace(/\D/g, '');
  const isEmailLogin = trimmedIdentifier.includes('@');
  const canSubmit = (mobileDigits.length === 10 || isEmailLogin) && password.length >= 6 && !loading;
  const lottieHeight = Math.max(160, Math.min(240, width * 0.45));
  const futureTextList = FUTURE_LINES[language] || FUTURE_LINES.en;
  const futureText = futureTextList[futureIndex];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: TYPOGRAPHY.motion.durationMs,
        easing: EMPHASIZED_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(liftIn, {
        toValue: 0,
        duration: TYPOGRAPHY.motion.durationMs,
        easing: EMPHASIZED_EASING,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, liftIn]);

  useEffect(() => {
    const imageTimer = setInterval(() => {
      setImageIndex(prev => (prev + 1) % TRAINING_IMAGES.length);
    }, 4600);
    return () => clearInterval(imageTimer);
  }, []);

  useEffect(() => {
    setFutureIndex(0);
  }, [language]);

  useEffect(() => {
    const futureTimer = setInterval(() => {
      setFutureIndex(prev => (prev + 1) % futureTextList.length);
    }, 3200);
    return () => clearInterval(futureTimer);
  }, [futureTextList.length]);

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
        clientType: 'mobile_app',
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
      source={{uri: TRAINING_IMAGES[imageIndex]}}
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
                    ]}
                    android_ripple={{color: TYPOGRAPHY.motion.rippleColor}}>
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
                    ]}
                    android_ripple={{color: TYPOGRAPHY.motion.rippleColor}}>
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
              <Text
                key={`${language}-${futureIndex}`}
                style={styles.futureText}>
                {futureText}
              </Text>

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
                  ]}
                  android_ripple={{color: TYPOGRAPHY.motion.rippleColor}}>
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
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.primaryLight,
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
    backgroundColor: COLORS.primary,
    opacity: 0.14,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    shadowColor: COLORS.primaryLight,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 5,
  },
  lottieBox: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textGray,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.android.support,
  },
  langSwitch: {
    flexDirection: 'row',
    gap: 8,
  },
  langChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  langChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.info,
  },
  langChipText: {
    color: COLORS.textGray,
    fontWeight: '600',
    fontSize: TYPOGRAPHY.android.support,
  },
  langChipTextActive: {
    color: COLORS.textDark,
    fontWeight: '800',
  },
  brand: {
    marginTop: 12,
    color: COLORS.textDark,
    fontWeight: '800',
    fontSize: TYPOGRAPHY.android.h1,
    lineHeight: 34,
    letterSpacing: 0.2,
  },
  title: {
    marginTop: 4,
    fontSize: TYPOGRAPHY.android.h2,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.textGray,
    fontSize: TYPOGRAPHY.android.body,
    lineHeight: TYPOGRAPHY.lineHeight.body,
  },
  futureText: {
    marginTop: 6,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.android.support,
  },
  form: {
    marginTop: 14,
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
  button: {
    marginTop: 4,
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
  errorText: {
    marginTop: 4,
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: TYPOGRAPHY.android.support,
  },
});
