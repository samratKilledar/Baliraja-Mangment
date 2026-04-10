import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TeacherHome from '../screens/teacher/TeacherHome';
import TeacherLectures from '../screens/teacher/TeacherLectures';
import TeacherSalary from '../screens/teacher/TeacherSalary';
import TeacherProfile from '../screens/teacher/TeacherProfile';
import TeacherLeave from '../screens/teacher/TeacherLeave';
import PlacedStudentsListScreen from '../screens/common/PlacedStudentsListScreen';
import ReferenceScreen from '../screens/common/ReferenceScreen';
import COLORS from '../config/colors';

const Tab = createBottomTabNavigator();
const TAB_LOGO = require('../assets/splash-default.png');
const TAB_ICONS: Record<string, string> = {
  TeachAttendance: 'calendar-check',
  TeachLectures: 'book-open-variant',
  TeachLeave: 'calendar-clock',
  TeachSalary: 'cash-multiple',
  TeachProfile: 'account-circle',
  TeachPlaced: 'briefcase-check',
  TeachReference: 'account-box-multiple',
};

export default function TeacherTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 76,
          paddingTop: 4,
          paddingBottom: 8,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          backgroundColor: COLORS.white
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarItemStyle: { borderRadius: 12, marginHorizontal: 4, marginTop: 2, minHeight: 48 },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textGray,
        tabBarActiveBackgroundColor: COLORS.info,
        tabBarInactiveBackgroundColor: COLORS.white,
        tabBarBackground: () => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
            <Image source={TAB_LOGO} style={{ width: 28, height: 28, opacity: 0.25 }} />
          </View>
        )
      }}
    >
      <Tab.Screen
        name="TeachAttendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.TeachAttendance}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          )
        }}
        component={TeacherHome}
      />
      <Tab.Screen
        name="TeachLectures"
        options={{
          title: 'Lectures',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.TeachLectures}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          )
        }}
        component={TeacherLectures}
      />
      <Tab.Screen
        name="TeachLeave"
        options={{
          title: 'Leave',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.TeachLeave}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          )
        }}
        component={TeacherLeave}
      />
      <Tab.Screen
        name="TeachSalary"
        options={{
          title: 'Salary',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.TeachSalary}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          )
        }}
        component={TeacherSalary}
      />
      <Tab.Screen
        name="TeachProfile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.TeachProfile}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          )
        }}
        component={TeacherProfile}
      />
      <Tab.Screen
        name="TeachPlaced"
        options={{
          title: 'Placed',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.TeachPlaced}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          )
        }}
        children={() => <PlacedStudentsListScreen title="Placed Students" />}
      />
      <Tab.Screen
        name="TeachReference"
        options={{
          title: 'Reference',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.TeachReference}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          )
        }}
        children={() => <ReferenceScreen mode="create" />}
      />
    </Tab.Navigator>
  );
}
