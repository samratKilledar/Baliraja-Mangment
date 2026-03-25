import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

const SCHOOL_TITLE = 'बलीराजा अकॅडमी अँड इंटरनॅशनल स्कूल';

export default function MovingSchoolBanner() {
  const translateX = useRef(new Animated.Value(0)).current;
  const {width} = useWindowDimensions();

  useEffect(() => {
    translateX.setValue(width);
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -width * 1.4,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [translateX, width]);

  return (
    <View style={styles.wrap}>
      <Animated.Text
        numberOfLines={1}
        style={[styles.text, {transform: [{translateX}]}]}>
        {SCHOOL_TITLE}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 28,
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#E7EEFF',
    justifyContent: 'center',
  },
  text: {
    position: 'absolute',
    paddingHorizontal: 12,
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
