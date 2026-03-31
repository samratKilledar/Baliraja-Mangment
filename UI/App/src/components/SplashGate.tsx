import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ImageBackground, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import Video from 'react-native-video';

const FALLBACK = require('../assets/splash-default.png');
const CACHE_KEY = 'ims_splash_image_url';
const MAX_FETCH_WAIT_MS = 1200;

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

export default function SplashGate({ appReady, minimumMs = 1000, children }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [fetchWaitExpired, setFetchWaitExpired] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const startedAt = useRef(Date.now());

  useEffect(() => {
    restoreCached();
    fetchRemote();
    const timer = setTimeout(() => setFetchWaitExpired(true), MAX_FETCH_WAIT_MS);
    return () => clearTimeout(timer);
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
    const requiredDuration = Math.min(Math.max(minimumMs, 0), 1000);
    const readyToHide = fetched || fetchWaitExpired;
    const hideNow = appReady && readyToHide && elapsed >= requiredDuration;
    if (hideNow) {
      Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setHidden(true));
      return;
    }
    if (appReady && readyToHide) {
      const timer = setTimeout(() => {
        Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setHidden(true));
      }, Math.max(requiredDuration - elapsed, 0));
      return () => clearTimeout(timer);
    }
  }, [appReady, fetched, fetchWaitExpired, hidden, fade, imageUrl, minimumMs, videoUrl]);

  useEffect(() => {
    if (Platform.OS !== 'android' || hidden) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 420, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce, hidden]);

  const source = useMemo(() => {
    if (videoUrl) return null;
    return imageUrl ? { uri: imageUrl } : FALLBACK;
  }, [imageUrl, videoUrl]);
  const showDefaultCaption = !imageUrl && !videoUrl;
  const captionBounceStyle = Platform.OS === 'android'
    ? {
        transform: [
          { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
          { scale: bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) },
        ],
      }
    : undefined;

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
            </View>
          ) : imageUrl ? (
            <ImageBackground source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={styles.defaultSplash}>
              {showDefaultCaption && (
                <Animated.View style={[styles.captionBox, captionBounceStyle]}>
                  <View style={styles.captionContent}>
                    <Text style={styles.title}>Baliraja Academy</Text>
                    <Text style={styles.subtitle}>Baliraja Academy Management App</Text>
                    <Text style={styles.note}>Empowering students, teachers, and administrators together.</Text>
                  </View>
                </Animated.View>
              )}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: '#dbeafe' },
  defaultSplash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#eef2ff',
  },
  captionBox: {
    position: 'absolute',
    bottom: 80,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9e1f6',
    left: 0,
    right: 0,
  },
  captionContent: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: { color: '#1f2f75', fontSize: 24, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  subtitle: { color: '#2f3e68', marginTop: 8, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  note: { color: '#4a5a7a', marginTop: 6, fontSize: 13, textAlign: 'center' }
});
