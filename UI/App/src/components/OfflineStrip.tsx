import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

export default function OfflineStrip() {
  const netInfo = useNetInfo();
  const offline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  if (!offline) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>No internet connection. Please check mobile data or Wi-Fi.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#cf2d2d',
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  text: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 12
  }
});
