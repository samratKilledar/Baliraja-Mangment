import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, Dimensions, Modal, Pressable } from 'react-native';
import FastImage from 'react-native-fast-image';
import client from '../api/client';
import LoadingOverlay from './LoadingOverlay';
import Video from 'react-native-video';
import COLORS from '../config/colors';
import TYPOGRAPHY from '../config/typography';

type Notice = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: string;
  publishedAt: string;
};

const screenW = Dimensions.get('window').width;

function normalizeUrl(url?: string) {
  if (!url) return '';
  let clean = url;
  if (clean.includes('/api/v1/uploads')) clean = clean.replace('/api/v1/uploads', '/uploads');
  if (clean.startsWith('http')) return clean;
  const base = (client.defaults.baseURL || '').replace(/\/api\/v1$/, '');
  return `${base}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

function isVideoNotice(item: Notice) {
  if (item.mediaType === 'video') return true;
  if (item.videoUrl) return true;
  const possible = item.imageUrl || '';
  return /\.(mp4|mov|mkv|webm)$/i.test(possible);
}

export default function NoticeCarousel() {
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewer, setViewer] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await client.get<Notice[]>('/notices');
      //alert(res)
      setItems(res.data);
      setError(null);
    } catch (err) {
      console.warn('Notices load failed---', err);
      setError('Unable to load announcements right now.');
    } finally {
      setLoading(false);
    }
  }

  if (loading && items.length === 0) return <ActivityIndicator style={{ marginTop: 12 }} />;
  if (!items.length) {
    return error ? <Text style={{ color: COLORS.danger, marginTop: 8 }}>{error}</Text> : null;
  }

  return (
    <View style={{marginBottom:20,}}>
      {error && <Text style={{ color: COLORS.danger, marginBottom: 6 }}>{error}</Text>}
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.strip}
        renderItem={({ item }) => {
          const isVideo = isVideoNotice(item);
          const mediaUrl = isVideo
            ? normalizeUrl(item.videoUrl || item.imageUrl)
            : item.imageUrl
            ? normalizeUrl(item.imageUrl)
            : '';
          return (
          <Pressable
            style={styles.card}
            onPress={() => mediaUrl && setViewer({ type: isVideo ? 'video' : 'image', url: mediaUrl })}
            android_ripple={{color: TYPOGRAPHY.motion.rippleColor}}
          >
            {isVideo && mediaUrl ? (
              <Video
                source={{ uri: mediaUrl }}
                style={styles.img}
                resizeMode="cover"
                paused={false}
                repeat
                muted
                onError={(e) => console.warn('Notice preview video error', e)}
              />
            ) : mediaUrl ? (
              <FastImage
                source={{ uri: mediaUrl, priority: FastImage.priority.normal }}
                style={styles.img}
                resizeMode={FastImage.resizeMode.contain}
              />
            ) : null}
            <View style={styles.textBox}>
              <Text style={styles.date}>{new Date(item.publishedAt).toLocaleDateString()}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc}>{item.description}</Text>
            </View>
          </Pressable>
        );
        }}
      />
      <LoadingOverlay visible={loading} label="Loading announcements..." />
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalClose} onPress={() => setViewer(null)}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          {viewer && viewer.type === 'image' && (
            <FastImage source={{ uri: viewer.url }} style={styles.fullImg} resizeMode={FastImage.resizeMode.contain} />
          )}
          {viewer && viewer.type === 'video' && (
            <Video
              source={{ uri: viewer.url }}
              style={styles.fullImg}
              resizeMode="contain"
              controls
              paused={false}
              muted={false}
              volume={1.0}
              ignoreSilentSwitch="ignore"
              onError={(e) => console.warn('Notice modal video error', e)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: 10, gap: 12 },
  card: {
    width: screenW * 0.9,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: COLORS.primaryLight,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  img: { width: screenW * 0.35, height: screenW * 0.35, borderRadius: 10, backgroundColor: COLORS.light },
  textBox: { flex: 1, marginLeft: 12 },
  date: { color: COLORS.textGray, fontSize: TYPOGRAPHY.android.support, marginBottom: 4 },
  title: { fontWeight: '700', fontSize: TYPOGRAPHY.android.body, marginBottom: 6, color: COLORS.textDark },
  desc: { color: COLORS.text, fontSize: TYPOGRAPHY.android.support, lineHeight: 22 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.modalOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  },
  fullImg: {
    width: '100%',
    height: '80%',
    borderRadius: 12
  },
  modalClose: {
    position: 'absolute',
    top: 30,
    right: 20,
    zIndex: 2,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8
  },
  closeText: { color: '#fff', fontWeight: '700' }
});
