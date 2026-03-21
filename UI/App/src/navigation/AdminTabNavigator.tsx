import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, ScrollView } from 'react-native';
import AdminHome from '../screens/admin/AdminHome';
import NoticeCarousel from '../components/NoticeCarousel';

const Tab = createBottomTabNavigator();

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <ScrollView contentContainerStyle={styles.placeholder}>
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
  return (
    <ScrollView contentContainerStyle={styles.noticeWrap}>
      <Text style={styles.title}>Notice Publisher</Text>
      <Text style={styles.desc}>View recent notices. Publishing is available on web for now.</Text>
      <NoticeCarousel />
    </ScrollView>
  );
}

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Analytics" component={AdminHome} />
      <Tab.Screen name="Students" component={StudentsScreen} />
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
