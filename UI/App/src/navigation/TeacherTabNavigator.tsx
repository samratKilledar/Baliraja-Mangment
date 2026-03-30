import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import TeacherHome from '../screens/teacher/TeacherHome';
import TeacherLectures from '../screens/teacher/TeacherLectures';
import TeacherSalary from '../screens/teacher/TeacherSalary';
import TeacherProfile from '../screens/teacher/TeacherProfile';
import TeacherLeave from '../screens/teacher/TeacherLeave';
import PlacedStudentsListScreen from '../screens/common/PlacedStudentsListScreen';
import ReferenceScreen from '../screens/common/ReferenceScreen';
import COLORS from '../config/colors';

type TabIconProps = { source: any; focused: boolean };

function TabIcon({ source, focused }: TabIconProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <LottieView source={source} autoPlay loop style={{ width: 34, height: 34, opacity: focused ? 1 : 0.72 }} />
    </View>
  );
}

const Tab = createBottomTabNavigator();

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
        tabBarInactiveBackgroundColor: COLORS.white
      }}
    >
      <Tab.Screen
        name="TeachAttendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../assets/animations/tab-leave.json')} focused={focused} />
        }}
        component={TeacherHome}
      />
      <Tab.Screen
        name="TeachLectures"
        options={{
          title: 'Lectures',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../assets/animations/tab-complaint.json')} focused={focused} />
        }}
        component={TeacherLectures}
      />
      <Tab.Screen
        name="TeachLeave"
        options={{
          title: 'Leave',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../assets/animations/leave-menu.json')} focused={focused} />
        }}
        component={TeacherLeave}
      />
      <Tab.Screen
        name="TeachSalary"
        options={{
          title: 'Salary',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../assets/animations/tab-fees.json')} focused={focused} />
        }}
        component={TeacherSalary}
      />
      <Tab.Screen
        name="TeachProfile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../assets/animations/tab-profile.json')} focused={focused} />
        }}
        component={TeacherProfile}
      />
      <Tab.Screen
        name="TeachPlaced"
        options={{
          title: 'Placed',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../assets/animations/profile-menu.json')} focused={focused} />
        }}
        children={() => <PlacedStudentsListScreen title="Placed Students" />}
      />
      <Tab.Screen
        name="TeachReference"
        options={{
          title: 'Reference',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../assets/animations/complaint-menu.json')} focused={focused} />
        }}
        children={() => <ReferenceScreen mode="create" />}
      />
    </Tab.Navigator>
  );
}
