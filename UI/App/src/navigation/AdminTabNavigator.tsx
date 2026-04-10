import React, {useCallback, useState} from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AdminHome from '../screens/admin/AdminHome';
import NoticeCarousel from '../components/NoticeCarousel';
import PlacedStudentsListScreen from '../screens/common/PlacedStudentsListScreen';
import ReferenceScreen from '../screens/common/ReferenceScreen';
import COLORS from '../config/colors';
import ScreenBackground from '../components/ScreenBackground';

const Tab = createBottomTabNavigator();
const TAB_LOGO = require('../assets/splash-default.png');
const TAB_ICONS: Record<string, string> = {
  Analytics: 'chart-box',
  Students: 'account-group',
  Notices: 'bell-badge',
  Placed: 'briefcase-check',
  Reference: 'account-box-multiple',
};

function Placeholder({ title, description }: { title: string; description: string }) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.placeholder}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>
      </ScrollView>
    </ScreenBackground>
  );
}

function StudentsScreen() {
  return (
    <Placeholder
      title="Student List"
      description="Mobile student list is under construction. Use the web dashboard for full access."
    />
  );
}

function NoticesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.noticeWrap}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <Text style={styles.title}>Notice Publisher</Text>
        <Text style={styles.desc}>
          View recent notices. Publishing is available on web for now.
        </Text>
        <NoticeCarousel />
      </ScrollView>
    </ScreenBackground>
  );
}

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textGray,
        tabBarActiveBackgroundColor: COLORS.info,
        tabBarInactiveBackgroundColor: COLORS.white,
        tabBarBackground: () => (
          <View style={styles.tabBarBg} pointerEvents="none">
            <Image source={TAB_LOGO} style={styles.tabBarLogo} />
          </View>
        ),
      }}>
      <Tab.Screen
        name="Analytics"
        component={AdminHome}
        options={{
          tabBarIcon: ({focused}) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.Analytics}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Students"
        component={StudentsScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.Students}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Notices"
        component={NoticesScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.Notices}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Placed"
        children={() => <PlacedStudentsListScreen title="Placed Students" />}
        options={{
          tabBarIcon: ({focused}) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.Placed}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Reference"
        children={() => <ReferenceScreen mode="create" />}
        options={{
          tabBarIcon: ({focused}) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.Reference}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, textAlign: 'center' },
  desc: { marginTop: 10, fontSize: 14, color: COLORS.textGray, textAlign: 'center' },
  noticeWrap: { flexGrow: 1, padding: 16, backgroundColor: 'transparent' },
  tabBar: {
    height: 76,
    paddingTop: 4,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabItem: {
    borderRadius: 12,
    marginHorizontal: 4,
    marginTop: 2,
    minHeight: 48,
  },
  tabBarBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarLogo: {
    width: 28,
    height: 28,
    opacity: 0.25,
  },
});
