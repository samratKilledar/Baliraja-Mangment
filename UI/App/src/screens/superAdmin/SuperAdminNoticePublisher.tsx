import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Asset, launchImageLibrary} from 'react-native-image-picker';
import client from '../../api/client';
import NoticeCarousel from '../../components/NoticeCarousel';
import MovingSchoolBanner from '../../components/MovingSchoolBanner';
import SuperAdminTopBar from '../../components/SuperAdminTopBar';
import ScreenBackground from '../../components/ScreenBackground';

type Notice = {
  _id: string;
  title: string;
  description?: string;
  publishedAt?: string;
  imageUrl?: string;
  videoUrl?: string;
};

export default function SuperAdminNoticePublisher() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [carouselKey, setCarouselKey] = useState(0);
  const uploadedImages = items.filter(item => !!item.imageUrl);

  const loadNotices = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const {data} = await client.get('/notices');
      setItems(Array.isArray(data) ? data : []);
      setError('');
      setCarouselKey(prev => prev + 1);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load notices.');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  async function chooseImage() {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
      });

      if (result.didCancel) {
        return;
      }

      if (result.assets?.[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Gallery error', 'Unable to open local gallery right now.');
    }
  }

  async function publishNotice() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Enter notice title before publishing.');
      return;
    }

    try {
      setSaving(true);
      if (selectedImage?.uri) {
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('audience', 'all');
        formData.append('file', {
          uri: selectedImage.uri,
          type: selectedImage.type || 'image/jpeg',
          name: selectedImage.fileName || `notice-${Date.now()}.jpg`,
        } as any);

        await client.post('/notices', formData, {
          headers: {'Content-Type': 'multipart/form-data'},
        });
      } else {
        await client.post('/notices', {
          title: title.trim(),
          description: description.trim(),
          audience: 'all',
        });
      }
      setTitle('');
      setDescription('');
      setSelectedImage(null);
      await loadNotices();
      Alert.alert('Published', 'Notice published successfully.');
    } catch (err: any) {
      Alert.alert(
        'Publish failed',
        err?.response?.data?.message || 'Unable to publish notice.',
      );
    } finally {
      setSaving(false);
    }
  }

  function normalizeUrl(url?: string) {
    if (!url) {
      return '';
    }
    let clean = url;
    if (clean.includes('/api/v1/uploads')) {
      clean = clean.replace('/api/v1/uploads', '/uploads');
    }
    if (clean.startsWith('http')) {
      return clean;
    }
    const base = (client.defaults.baseURL || '').replace(/\/api\/v1$/, '');
    return `${base}${clean.startsWith('/') ? clean : `/${clean}`}`;
  }

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotices(true)}
          />
        }>
        <SuperAdminTopBar />
        <MovingSchoolBanner />
        <Text style={styles.title}>Notice Publisher</Text>
        <Text style={styles.subtitle}>
          Create notices from super-admin login and read the latest posts from
          DB.
        </Text>

        <View style={styles.carouselCard}>
          <Text style={styles.sectionTitle}>Notice Preview</Text>
          <NoticeCarousel key={carouselKey} />
        </View>

        {uploadedImages.length ? (
          <View style={styles.galleryStripCard}>
            <Text style={styles.sectionTitle}>Uploaded Images</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryStrip}>
              {uploadedImages.map(item => (
                <View key={`img-${item._id}`} style={styles.galleryItem}>
                  <Image
                    source={{uri: normalizeUrl(item.imageUrl)}}
                    style={styles.galleryImage}
                  />
                  <Text numberOfLines={1} style={styles.galleryCaption}>
                    {item.title || 'Notice image'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Notice title"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Notice description"
            placeholderTextColor="#9CA3AF"
            multiline
            style={[styles.input, styles.textArea]}
          />
          <Pressable style={styles.galleryButton} onPress={chooseImage}>
            <Text style={styles.galleryButtonText}>
              {selectedImage
                ? 'Change Image From Gallery'
                : 'Upload Image From Gallery'}
            </Text>
          </Pressable>
          {selectedImage?.uri ? (
            <View style={styles.previewCard}>
              <Image
                source={{uri: selectedImage.uri}}
                style={styles.previewImage}
              />
              <Text style={styles.previewName}>
                {selectedImage.fileName || 'Selected image ready to upload'}
              </Text>
              <Pressable onPress={() => setSelectedImage(null)}>
                <Text style={styles.removeImageText}>Remove image</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable
            style={({pressed}) => [
              styles.publishButton,
              pressed && styles.publishButtonPressed,
            ]}
            onPress={publishNotice}
            disabled={saving}>
            <Text style={styles.publishText}>
              {saving ? 'Publishing...' : 'Publish Notice'}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {items.map(item => (
          <View key={item._id} style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>{item.title}</Text>
            <Text style={styles.noticeDate}>
              {item.publishedAt
                ? new Date(item.publishedAt).toLocaleString()
                : '—'}
            </Text>
            {item.imageUrl ? (
              <Text style={styles.mediaTag}>Image attached from mobile</Text>
            ) : null}
            {item.videoUrl ? (
              <Text style={styles.mediaTag}>Video attached</Text>
            ) : null}
            <Text style={styles.noticeDesc}>
              {item.description || 'No description provided.'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  title: {
    marginTop: 14,
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 14,
  },
  formCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  carouselCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  galleryStripCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  galleryStrip: {
    paddingHorizontal: 14,
    gap: 12,
  },
  galleryItem: {
    width: Math.min(Dimensions.get('window').width * 0.52, 220),
  },
  galleryImage: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  galleryCaption: {
    marginTop: 8,
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    paddingHorizontal: 14,
    marginBottom: 8,
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    marginTop: 12,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  galleryButton: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#E7EEFF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  galleryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '800',
  },
  previewCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  previewName: {
    marginTop: 10,
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  removeImageText: {
    marginTop: 8,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  publishButton: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  publishButtonPressed: {
    opacity: 0.85,
  },
  publishText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  loader: {
    marginTop: 18,
  },
  error: {
    marginTop: 14,
    color: '#B91C1C',
    fontWeight: '700',
  },
  noticeCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  noticeTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  noticeDate: {
    marginTop: 6,
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  noticeDesc: {
    marginTop: 8,
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  mediaTag: {
    marginTop: 8,
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
});
