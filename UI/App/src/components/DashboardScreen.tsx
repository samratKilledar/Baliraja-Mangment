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
};

type SlideItem = {
  id: string;
  title: string;
  uri: string;
  description: string;
};

const defaultSlides: SlideItem[] = [];
const SCHOOL_SCROLL_TITLE = 'बलीराजा अकॅडमी अँड इंटरनॅशनल स्कूल';

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
  const localizedTitle = language === 'mr' ? roleTitle[role].mr : title;
  const localizedSubtitle =
    language === 'mr' ? `${subtitle} (मराठी)` : subtitle;
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
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
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
          <Text style={styles.title}>{localizedTitle}</Text>
          <Text style={styles.subtitle}>{localizedSubtitle}</Text>
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
                  onPress={() => handleMenuPress(item)}>
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
                style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleAddSlide} style={styles.uploadButton}>
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
    backgroundColor: '#eef2ff',
  },
  fixedHeader: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 4,
    backgroundColor: '#eef2ff',
    borderBottomWidth: 1,
    borderBottomColor: '#d7def7',
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
    borderTopColor: '#d7def7',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#d4dcf6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    backgroundColor: '#8eb1ff',
  },
  langSwitch: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 8,
  },
  brandCorner: {
    marginLeft: 10,
    maxWidth: '62%',
    color: '#1c2f7f',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  marqueeWrap: {
    marginTop: 10,
    height: 24,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#e7eeff',
    borderWidth: 1,
    borderColor: '#cad7ff',
    justifyContent: 'center',
  },
  marqueeText: {
    position: 'absolute',
    color: '#1d3fa6',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    paddingHorizontal: 12,
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
  title: {
    marginTop: 10,
    color: '#1f2f75',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#5d678d',
    marginTop: 7,
  },
  headerMeta: {
    marginTop: 6,
    color: '#1f2f75',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#233577',
    fontWeight: '700',
    marginBottom: 10,
    fontSize: 14,
  },
  sliderWrap: {
    // marginTop: 12,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#d4dcf6',
    borderRadius: 14,
    padding: 12,
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
    color: '#21316f',
    fontWeight: '700',
  },
  slideDescription: {
    marginTop: 4,
    color: '#5d678d',
    fontSize: 12,
  },
  menuCard: {
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#d4dcf6',
    borderRadius: 14,
    padding: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuItem: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8def1',
    backgroundColor: '#f8faff',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  menuPressed: {
    transform: [{scale: 0.98}],
  },
  menuItemText: {
    textAlign: 'center',
    color: '#24305f',
    fontWeight: '700',
  },
  trainingCard: {
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#d4dcf6',
    borderRadius: 14,
    padding: 12,
  },
  trainingSubtitle: {
    color: '#6674a4',
    marginBottom: 8,
  },
  trainingRow: {
    borderWidth: 1,
    borderColor: '#dce2f7',
    borderRadius: 10,
    backgroundColor: '#f8faff',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trainingName: {
    color: '#24305f',
    fontWeight: '700',
  },
  trainingProgress: {
    color: '#0f7d49',
    fontWeight: '700',
  },
  panel: {
    marginTop: 10,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d4dcf6',
    padding: 14,
  },
  panelStudent: {
    marginTop: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
  },
  panelTitle: {
    color: '#1e2b64',
    fontWeight: '700',
  },
  panelText: {
    color: '#53608d',
    marginTop: 4,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaPill: {
    backgroundColor: '#e5f7ee',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  metaPillText: {
    color: '#0f7d49',
    fontWeight: '700',
    fontSize: 12,
  },
  metaText: {
    color: '#6f7898',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d7ddf5',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2a5a',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dbe2f7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 8,
    color: COLORS.textDark,
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
    borderColor: '#a8b5ed',
    alignItems: 'center',
    paddingVertical: 11,
    backgroundColor: '#f4f6ff',
  },
  cancelButtonText: {
    color: '#3046a5',
    fontWeight: '700',
  },
  uploadButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
    backgroundColor: '#1f3698',
  },
  uploadButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
