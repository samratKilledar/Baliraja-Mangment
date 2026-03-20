import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ImageBackground, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import Video from 'react-native-video';

const FALLBACK = require('../assets/splash-default.png');
const CACHE_KEY = 'ims_splash_image_url';

function normalizeUrl(url?: string) {
  if (!url) return '';
  let clean = url;
  if (clean.includes('/api/v1/uploads')) clean = clean.replace('/api/v1/uploads', '/uploads');
  if (clean.startsWith('http')) return clean;
  const base = (client.defaults.baseURL || '').replace(/\/api\/v1$/, '');
  return `${base}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

type Props = {
  appReady: boolean;
  minimumMs?: number;
  children: React.ReactNode;
};

export default function SplashGate({ appReady, minimumMs = 1200, children }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const startedAt = useRef(Date.now());

  useEffect(() => {
    restoreCached();
    fetchRemote();
  }, []);

  async function restoreCached() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return;
      const isVideo = /\.(mp4|mov|mkv|webm)$/i.test(cached);
      if (isVideo) setVideoUrl(cached);
      else setImageUrl(cached);
    } catch {
      // ignore cache errors
    }
  }

  async function fetchRemote() {
    try {
      const res = await client.get<{ imageUrl?: string; videoUrl?: string; mediaType?: string }>('/branding/splash');
      const resolvedImg = normalizeUrl(res.data?.imageUrl);
      const resolvedVideo = normalizeUrl(res.data?.videoUrl);
      if (res.data?.mediaType === 'video' && resolvedVideo) {
        setVideoUrl(resolvedVideo);
        setImageUrl(null);
        await AsyncStorage.setItem(CACHE_KEY, resolvedVideo);
      } else if (resolvedImg) {
        setImageUrl(resolvedImg);
        setVideoUrl(null);
        await AsyncStorage.setItem(CACHE_KEY, resolvedImg);
      } else {
        setImageUrl(null);
        setVideoUrl(null);
        await AsyncStorage.removeItem(CACHE_KEY);
      }
    } catch (err) {
      const e = err as any;
      console.warn('Splash media fetch failed', e?.message || e);
    } finally {
      setFetched(true);
    }
  }

  useEffect(() => {
    if (hidden) return;
    const elapsed = Date.now() - startedAt.current;
    const requiredDuration = videoUrl ? 4000 : minimumMs;
    const hideNow = appReady && fetched && elapsed >= requiredDuration;
    if (hideNow) {
      Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setHidden(true));
      return;
    }
    if (appReady && fetched) {
      const timer = setTimeout(() => {
        Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setHidden(true));
      }, Math.max(requiredDuration - elapsed, 0));
      return () => clearTimeout(timer);
    }
  }, [appReady, fetched, hidden, fade, minimumMs, videoUrl]);

  const source = useMemo(() => {
    if (videoUrl) return null;
    return imageUrl ? { uri: imageUrl } : FALLBACK;
  }, [imageUrl, videoUrl]);
  const showDefaultCaption = !imageUrl && !videoUrl;

  return (
    <View style={{ flex: 1 }}>
      {children}
      {!hidden && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fade }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#e2e8ff" />
          {videoUrl ? (
            <View style={StyleSheet.absoluteFill}>
              <Video
                source={{ uri: videoUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                repeat
                muted
                paused={false}
              />
              <View style={styles.scrim} />
            </View>
          ) : (
            <ImageBackground source={source} style={StyleSheet.absoluteFill} resizeMode="cover">
              <View style={styles.scrim} />
              {showDefaultCaption && (
                <View style={styles.captionBox}>
                  <Text style={styles.title}>Career Academy</Text>
                  <Text style={styles.subtitle}>Preparing your experience...</Text>
                </View>
              )}
            </ImageBackground>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: '#dbeafe' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.08)' },
  captionBox: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { color: '#dbeafe', marginTop: 6, fontSize: 14 }
});
