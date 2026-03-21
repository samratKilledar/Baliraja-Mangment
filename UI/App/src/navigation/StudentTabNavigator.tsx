import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import StudentHome, { StudentMenu } from '../screens/student/StudentHome';

type TabIconProps = {
  source: any;
  focused: boolean;
};

function TabIcon({ source, focused }: TabIconProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <LottieView source={source} autoPlay loop style={{ width: 34, height: 34, opacity: focused ? 1 : 0.72 }} />
    </View>
  );
}

function StudentTabScreen({ menu }: { menu: StudentMenu }) {
  return <StudentHome menuOverride={menu} />;
}

const Tab = createBottomTabNavigator();

export default function StudentTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 76,
          paddingTop: 4,
          paddingBottom: 8,
          borderTopColor: '#d7def7',
          borderTopWidth: 1,
          backgroundColor: '#ffffff'
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700'
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 4,
          marginTop: 2
        },
        tabBarActiveTintColor: '#1f3ca8',
        tabBarInactiveTintColor: '#6677a6',
        tabBarActiveBackgroundColor: '#e7eeff',
        tabBarInactiveBackgroundColor: '#ffffff'
      }}
    >
      <Tab.Screen
        name="FeesTab"
        options={{
          title: 'Fees',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../assets/animations/tab-fees.json')} focused={focused} />
          )
        }}
      >
        {() => <StudentTabScreen menu="Fees" />}
      </Tab.Screen>
      <Tab.Screen
        name="AttendanceTab"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../assets/animations/tab-leave.json')} focused={focused} />
          )
        }}
      >
        {() => <StudentTabScreen menu="Attendance" />}
      </Tab.Screen>
      <Tab.Screen
        name="ProfileTab"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../assets/animations/tab-profile.json')} focused={focused} />
          )
        }}
      >
        {() => <StudentTabScreen menu="Profile" />}
      </Tab.Screen>
      <Tab.Screen
        name="ComplaintTab"
        options={{
          title: 'Complaint',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../assets/animations/tab-complaint.json')} focused={focused} />
          )
        }}
      >
        {() => <StudentTabScreen menu="Complaint" />}
      </Tab.Screen>
      <Tab.Screen
        name="LeaveTab"
        options={{
          title: 'Leave',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../assets/animations/tab-leave.json')} focused={focused} />
          )
        }}
      >
        {() => <StudentTabScreen menu="Leave" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
