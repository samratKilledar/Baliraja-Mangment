import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import StudentHome, { StudentMenu } from '../screens/student/StudentHome';
import COLORS from '../config/colors';

function StudentTabScreen({ menu }: { menu: StudentMenu }) {
  return <StudentHome menuOverride={menu} />;
}

const Tab = createBottomTabNavigator();
const TAB_LOGO = require('../assets/splash-default.png');
const TAB_ICONS: Record<string, string> = {
  FeesTab: 'cash-multiple',
  ProfileTab: 'account-circle',
  ComplaintTab: 'message-alert',
  LeaveTab: 'calendar-clock',
};

export default function StudentTabNavigator() {
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700'
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 4,
          marginTop: 2,
          minHeight: 48
        },
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
        name="FeesTab"
        options={{
          title: 'Fees',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.FeesTab}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          ),
        }}
      >
        {() => <StudentTabScreen menu="Fees" />}
      </Tab.Screen>
      <Tab.Screen
        name="ProfileTab"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.ProfileTab}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          ),
        }}
      >
        {() => <StudentTabScreen menu="Profile" />}
      </Tab.Screen>
      <Tab.Screen
        name="ComplaintTab"
        options={{
          title: 'Complaint',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.ComplaintTab}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          ),
        }}
      >
        {() => <StudentTabScreen menu="Complaint" />}
      </Tab.Screen>
      <Tab.Screen
        name="LeaveTab"
        options={{
          title: 'Leave',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS.LeaveTab}
              size={20}
              color={focused ? COLORS.primary : COLORS.textGray}
            />
          ),
        }}
      >
        {() => <StudentTabScreen menu="Leave" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
