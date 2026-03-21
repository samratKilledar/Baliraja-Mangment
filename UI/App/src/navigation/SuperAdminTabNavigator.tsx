import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, ScrollView } from 'react-native';
import SuperAdminHome from '../screens/superAdmin/SuperAdminHome';
import NoticeCarousel from '../components/NoticeCarousel';

const Tab = createBottomTabNavigator();

function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <ScrollView contentContainerStyle={styles.placeholder}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
    </ScrollView>
  );
}

function StudentListScreen() {
  return (
    <PlaceholderScreen
      title="Student List"
      description="Student listing coming soon in mobile. For now, use the web dashboard to manage students."
    />
  );
}

function NoticesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.noticeWrap}>
      <Text style={styles.title}>Notice Publisher</Text>
      <Text style={styles.desc}>Recent notices (read-only). Publishing is available on web.</Text>
      <NoticeCarousel />
    </ScrollView>
  );
}

export default function SuperAdminTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Analytics" component={SuperAdminHome} />
      <Tab.Screen name="Students" component={StudentListScreen} />
      <Tab.Screen name="Notices" component={NoticesScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fd'
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1f2f75', textAlign: 'center' },
  desc: { marginTop: 10, fontSize: 14, color: '#4b5774', textAlign: 'center' },
  noticeWrap: { flexGrow: 1, padding: 16, backgroundColor: '#f7f9fd' }
});
