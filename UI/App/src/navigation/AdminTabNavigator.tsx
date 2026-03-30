import React, {useCallback, useState} from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import AdminHome from '../screens/admin/AdminHome';
import NoticeCarousel from '../components/NoticeCarousel';
import PlacedStudentsListScreen from '../screens/common/PlacedStudentsListScreen';
import ReferenceScreen from '../screens/common/ReferenceScreen';
import COLORS from '../config/colors';

const Tab = createBottomTabNavigator();

function Placeholder({ title, description }: { title: string; description: string }) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.placeholder}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
    </ScrollView>
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
    <ScrollView
      contentContainerStyle={styles.noticeWrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Notice Publisher</Text>
      <Text style={styles.desc}>View recent notices. Publishing is available on web for now.</Text>
      <NoticeCarousel />
    </ScrollView>
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
      }}>
      <Tab.Screen name="Analytics" component={AdminHome} />
      <Tab.Screen name="Students" component={StudentsScreen} />
      <Tab.Screen name="Notices" component={NoticesScreen} />
      <Tab.Screen name="Placed" children={() => <PlacedStudentsListScreen title="Placed Students" />} />
      <Tab.Screen name="Reference" children={() => <ReferenceScreen mode="create" />} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, textAlign: 'center' },
  desc: { marginTop: 10, fontSize: 14, color: COLORS.textGray, textAlign: 'center' },
  noticeWrap: { flexGrow: 1, padding: 16, backgroundColor: COLORS.background },
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
});
