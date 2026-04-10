import React, {ReactNode} from 'react';
import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';

type ScreenBackgroundProps = {
  children: ReactNode;
};

const BACKGROUND_IMAGE = require('../assets/splash-default.png');

export default function ScreenBackground({children}: ScreenBackgroundProps) {
  return (
    <ImageBackground
      source={BACKGROUND_IMAGE}
      resizeMode="cover"
      style={styles.background}>
      <View pointerEvents="none" style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>{children}</SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
  },
  safeArea: {
    flex: 1,
  },
});
