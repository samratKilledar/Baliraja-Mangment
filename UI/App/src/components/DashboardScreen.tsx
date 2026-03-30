import React, {ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import ImageView from '@apexglory/react-native-image-viewing';
import COLORS from '../config/colors';
import TYPOGRAPHY from '../config/typography';
import LoadingOverlay from './LoadingOverlay';
import {Role} from '../types';
import {useLanguage} from '../context/LanguageContext';
import {tx} from '../i18n/strings';
import NoticeCarousel from './NoticeCarousel';

type DashboardScreenProps = {
  title: string;
  subtitle: string;
  headerMeta?: string;
  role: Role;
  loading: boolean;
  loadingLabel: string;
  filter: string;
  filters: string[];
  onFilterChange: (value: string) => void;
  extraHeader?: ReactNode;
  children?: ReactNode;
  bottomBar?: ReactNode;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
};

type SlideItem = {
  id: string;
  title: string;
  uri: string;
  description: string;
};

const defaultSlides: SlideItem[] = [];
const SCHOOL_SCROLL_TITLE = 'बलीराजा अकॅडमी अँड इंटरनॅशनल स्कूल';
const EMPHASIZED_EASING = Easing.bezier(...TYPOGRAPHY.motion.easing);

const roleTitle: Record<Role, {en: string; mr: string}> = {
  super_admin: {en: 'Super Admin Dashboard', mr: 'सुपर अॅडमिन डॅशबोर्ड'},
  admin: {en: 'Admin Dashboard', mr: 'अॅडमिन डॅशबोर्ड'},
  teacher: {en: 'Teacher Dashboard', mr: 'शिक्षक डॅशबोर्ड'},
  student: {en: 'Student Dashboard', mr: 'विद्यार्थी डॅशबोर्ड'},
  parent: {en: 'Parent Dashboard', mr: 'पालक डॅशबोर्ड'},
};

export default function DashboardScreen({
  title,
  subtitle,
  headerMeta,
  role,
  loading,
  loadingLabel,
  filter,
  filters,
  onFilterChange,
  extraHeader,
  children,
  bottomBar,
  onScroll,
  scrollEventThrottle,
  refreshing = false,
  onRefresh,
}: DashboardScreenProps) {
  const {language, setLanguage} = useLanguage();
  const t = tx(language);

  const [slides, setSlides] = useState(defaultSlides);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUri, setNewUri] = useState('');
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;
  const marqueeX = useRef(new Animated.Value(0)).current;
  const {width} = useWindowDimensions();
  const [activeSlide, setActiveSlide] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const slideListRef = useRef<FlatList<SlideItem> | null>(null);

  const canManageSlides = role === 'super_admin' || role === 'admin';
  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';
  const hasTitle = Boolean(title?.trim());
  const hasSubtitle = Boolean(subtitle?.trim());
  const localizedTitle = hasTitle
    ? (language === 'mr' ? roleTitle[role].mr : title)
    : '';
  const localizedSubtitle = hasSubtitle
    ? (language === 'mr' ? `${subtitle} (मराठी)` : subtitle)
    : '';
  const slideCardWidth = Math.max(240, width - 56);
  const imageViewerData = useMemo(
    () => slides.map(slide => ({uri: slide.uri})),
    [slides],
  );

  const menuItems = useMemo(() => {
    const base =
      language === 'mr'
        ? ['आढावा', 'उपस्थिती', 'प्रगती']
        : ['Overview', 'Attendance', 'Performance'];
    const withFees = language === 'mr' ? [...base, 'फी'] : [...base, 'Fees'];
    const coreItems = role === 'super_admin' ? withFees : base;
    if (canManageSlides) {
      return [
        ...coreItems,
        language === 'mr' ? 'प्रतिमा अपलोड' : 'Upload Image',
        language === 'mr' ? 'स्लाइड शेअर' : 'Share Slide',
      ];
    }
    return [
      ...coreItems,
      language === 'mr' ? 'संदेश' : 'Messages',
      language === 'mr' ? 'प्रोफाइल' : 'Profile',
    ];
  }, [canManageSlides, language, role]);

  const trainingCards = useMemo(
    () =>
      language === 'mr'
        ? [
            {name: 'Leadership Bootcamp', progress: '72% पूर्ण'},
            {name: 'Classroom AI Tools', progress: '45% पूर्ण'},
            {name: 'Parent Communication', progress: '88% पूर्ण'},
          ]
        : [
            {name: 'Leadership Bootcamp', progress: '72% complete'},
            {name: 'Classroom AI Tools', progress: '45% complete'},
            {name: 'Parent Communication', progress: '88% complete'},
          ],
    [language],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: TYPOGRAPHY.motion.durationMs,
        easing: EMPHASIZED_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: TYPOGRAPHY.motion.durationMs,
        easing: EMPHASIZED_EASING,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, slideUp, filter]);

  useEffect(() => {
    marqueeX.setValue(width);
    const animation = Animated.loop(
      Animated.timing(marqueeX, {
        toValue: -width * 1.35,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [marqueeX, width]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => {
        const nextIndex = (prev + 1) % slides.length;
        slideListRef.current?.scrollToIndex({index: nextIndex, animated: true});
        return nextIndex;
      });
    }, 2800);
    return () => clearInterval(timer);
  }, [slides.length]);

  async function handleShare() {
    const slide = slides[0];
    await Share.share({
      message: `${slide.title}\n${slide.uri}`,
    });
  }

  function handleAddSlide() {
    if (!newUri.trim()) {
      Alert.alert(t.missingImageTitle, t.missingImageMessage);
      return;
    }
    const nextSlide: SlideItem = {
      id: `${Date.now()}`,
      title: newTitle.trim() || 'Custom Slide',
      uri: newUri.trim(),
      description: 'New update from Baliraja Career Academy Gangapur.',
    };
    setSlides(prev => [nextSlide, ...prev]);
    setNewTitle('');
    setNewUri('');
    setUploadVisible(false);
  }

  function handleMenuPress(item: string) {
    const uploadLabel = language === 'mr' ? 'प्रतिमा अपलोड' : 'Upload Image';
    const shareLabel = language === 'mr' ? 'स्लाइड शेअर' : 'Share Slide';

    if (item === uploadLabel && canManageSlides) {
      setUploadVisible(true);
      return;
    }
    if (item === shareLabel && canManageSlides) {
      handleShare().catch(() => Alert.alert('Unable to share right now'));
      return;
    }
    Alert.alert(
      item,
      language === 'mr'
        ? 'ही स्क्रीन येथे लिंक करता येईल.'
        : `${item} screen can be linked here.`,
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={[
          styles.fixedHeader,
          isStudent && styles.fixedHeaderStudent,
          Platform.OS === 'android' && styles.fixedHeaderAndroid,
        ]}>
        <View
          style={[
            styles.headerCard,
            isStudent && styles.headerCardStudent,
            Platform.OS === 'android' && styles.headerCardAndroid,
          ]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerAccent} />
            <Text style={styles.brandCorner}>
              Baliraja Career Academy · EN / मराठी
            </Text>
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
          <View style={styles.marqueeWrap}>
            <Animated.Text
              style={[
                styles.marqueeText,
                {
                  transform: [{translateX: marqueeX}],
                },
              ]}
              numberOfLines={1}>
              {SCHOOL_SCROLL_TITLE}
            </Animated.Text>
          </View>
          {localizedTitle ? <Text style={styles.title}>{localizedTitle}</Text> : null}
          {localizedSubtitle ? <Text style={styles.subtitle}>{localizedSubtitle}</Text> : null}
          {headerMeta ? (
            <Text style={styles.headerMeta}>{headerMeta}</Text>
          ) : null}
          {extraHeader}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          bottomBar ? styles.scrollWithBottomBar : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}>
        <View style={styles.sliderWrap}>
          <Text style={styles.sectionTitle}>{t.dashboardAnnouncements}</Text>
          <NoticeCarousel />
        </View>

        {!isStudent && !isTeacher ? (
          <View style={styles.menuCard}>
            <Text style={styles.sectionTitle}>{t.dashboardMenu}</Text>
            <View style={styles.menuGrid}>
              {menuItems.map(item => (
                <Pressable
                  key={item}
                  style={({pressed}) => [
                    styles.menuItem,
                    pressed && styles.menuPressed,
                  ]}
                  onPress={() => handleMenuPress(item)}
                  android_ripple={{color: TYPOGRAPHY.motion.rippleColor}}>
                  <Text style={styles.menuItemText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {!isStudent && !isTeacher ? (
          <View style={styles.trainingCard}>
            <Text style={styles.sectionTitle}>{t.dashboardTraining}</Text>
            <Text style={styles.trainingSubtitle}>
              {t.dashboardTrainingSubtitle}
            </Text>
            {trainingCards.map(item => (
              <View key={item.name} style={styles.trainingRow}>
                <Text style={styles.trainingName}>{item.name}</Text>
                <Text style={styles.trainingProgress}>{item.progress}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {isStudent ? (
          <View style={[styles.panel, styles.panelStudent]}>{children}</View>
        ) : (
          <Animated.View
            style={[
              styles.panel,
              {opacity: fadeIn, transform: [{translateY: slideUp}]},
            ]}>
            <Text style={styles.panelTitle}>{t.dashboardCurrentView}</Text>
            <Text style={styles.panelText}>
              {t.dashboardShowing}: {filter}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{t.dashboardLive}</Text>
              </View>
              <Text style={styles.metaText}>{t.dashboardUpdated}</Text>
            </View>
            {children}
          </Animated.View>
        )}
      </ScrollView>

      {bottomBar ? <View style={styles.bottomBarWrap}>{bottomBar}</View> : null}

      <Modal
        visible={uploadVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUploadVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.uploadSlideTitle}</Text>
            <TextInput
              placeholder={t.slideTitlePlaceholder}
              placeholderTextColor={COLORS.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              style={styles.input}
            />
            <TextInput
              placeholder={t.imageUrlPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              value={newUri}
              onChangeText={setNewUri}
              style={styles.input}
            />
            <View style={styles.uploadActions}>
              <Pressable
                onPress={() => setUploadVisible(false)}
                style={styles.cancelButton}
                android_ripple={{color: TYPOGRAPHY.motion.rippleColor}}>
                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={handleAddSlide}
                style={styles.uploadButton}
                android_ripple={{color: TYPOGRAPHY.motion.rippleColor}}>
                <Text style={styles.uploadButtonText}>{t.upload}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ImageView
        images={imageViewerData}
        imageIndex={imageViewerIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
      />

      <LoadingOverlay visible={loading} label={loadingLabel} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedHeader: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 4,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fixedHeaderStudent: {
    paddingHorizontal: 0,
  },
  fixedHeaderAndroid: {
    paddingHorizontal: 0,
  },
  scroll: {
    padding: 7,
    paddingBottom: 5,
    paddingTop: 10,
  },
  scrollWithBottomBar: {
    paddingBottom: 90,
  },
  bottomBarWrap: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: COLORS.primaryLight,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  headerCardStudent: {
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  headerCardAndroid: {
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  headerAccent: {
    width: 56,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  langSwitch: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 8,
  },
  brandCorner: {
    marginLeft: 10,
    maxWidth: '62%',
    color: COLORS.textDark,
    fontSize: TYPOGRAPHY.android.support,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  marqueeWrap: {
    marginTop: 10,
    height: 24,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: COLORS.info,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  marqueeText: {
    position: 'absolute',
    color: COLORS.textDark,
    fontSize: TYPOGRAPHY.android.support,
    fontWeight: '800',
    letterSpacing: 0.2,
    paddingHorizontal: 12,
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
  title: {
    marginTop: 10,
    color: COLORS.textDark,
    fontSize: TYPOGRAPHY.android.h2,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.textGray,
    marginTop: 7,
    fontSize: TYPOGRAPHY.android.body,
    lineHeight: TYPOGRAPHY.lineHeight.body,
  },
  headerMeta: {
    marginTop: 6,
    color: COLORS.textDark,
    fontSize: TYPOGRAPHY.android.support,
    fontWeight: '700',
  },
  sectionTitle: {
    color: COLORS.textDark,
    fontWeight: '700',
    marginBottom: 10,
    fontSize: TYPOGRAPHY.android.body,
  },
  sliderWrap: {
    // marginTop: 12,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    shadowColor: COLORS.primaryLight,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  slideCard: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    margin: 5,
    // backgroundColor: '#dbe3ff'
  },
  sliderDots: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  sliderDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#c2cbed',
  },
  sliderDotActive: {
    width: 18,
    backgroundColor: '#2f4dc2',
  },
  slideImage: {
    width: '100%',
    height: 150,
    //margin:15,
    borderRadius: 10,
  },
  slideInfo: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  slideTitle: {
    color: COLORS.textDark,
    fontWeight: '700',
  },
  slideDescription: {
    marginTop: 4,
    color: COLORS.textGray,
    fontSize: TYPOGRAPHY.android.support,
  },
  menuCard: {
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    shadowColor: COLORS.primaryLight,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuItem: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.light,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  menuPressed: {
    transform: [{scale: 0.98}],
  },
  menuItemText: {
    textAlign: 'center',
    color: COLORS.textDark,
    fontWeight: TYPOGRAPHY.button.fontWeight,
    fontSize: TYPOGRAPHY.android.button,
    letterSpacing: TYPOGRAPHY.button.letterSpacing,
  },
  trainingCard: {
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    shadowColor: COLORS.primaryLight,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  trainingSubtitle: {
    color: COLORS.textGray,
    marginBottom: 8,
    fontSize: TYPOGRAPHY.android.support,
  },
  trainingRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.light,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trainingName: {
    color: COLORS.textDark,
    fontWeight: '700',
  },
  trainingProgress: {
    color: COLORS.success,
    fontWeight: '700',
  },
  panel: {
    marginTop: 10,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    shadowColor: COLORS.primaryLight,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  panelStudent: {
    marginTop: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
  },
  panelTitle: {
    color: COLORS.textDark,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.android.body,
  },
  panelText: {
    color: COLORS.textGray,
    marginTop: 4,
    fontSize: TYPOGRAPHY.android.body,
    lineHeight: TYPOGRAPHY.lineHeight.body,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaPill: {
    backgroundColor: COLORS.info,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  metaPillText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.android.support,
  },
  metaText: {
    color: COLORS.textGray,
    fontSize: TYPOGRAPHY.android.support,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.modalOverlay,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.android.h2,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 8,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
    fontSize: TYPOGRAPHY.android.body,
    lineHeight: TYPOGRAPHY.lineHeight.body,
  },
  uploadActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: COLORS.light,
  },
  cancelButtonText: {
    color: COLORS.textDark,
    fontWeight: TYPOGRAPHY.button.fontWeight,
    fontSize: TYPOGRAPHY.android.button,
    letterSpacing: TYPOGRAPHY.button.letterSpacing,
  },
  uploadButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.button.fontWeight,
    fontSize: TYPOGRAPHY.android.button,
    letterSpacing: TYPOGRAPHY.button.letterSpacing,
  },
});
