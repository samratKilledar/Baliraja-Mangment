import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {StyleSheet, Text, View} from 'react-native';
import SuperAdminHome from '../screens/superAdmin/SuperAdminHome';
import SuperAdminNoticePublisher from '../screens/superAdmin/SuperAdminNoticePublisher';
import SuperAdminStudentList from '../screens/superAdmin/SuperAdminStudentList';
import SuperAdminFinanceScreen from '../screens/superAdmin/SuperAdminFinanceScreen';
import PlacedStudentsListScreen from '../screens/common/PlacedStudentsListScreen';
import ReferenceScreen from '../screens/common/ReferenceScreen';
import COLORS from '../config/colors';

const Tab = createBottomTabNavigator();

const TAB_META: Record<string, {label: string; color: string; short: string}> =
  {
    Status: {label: 'Status', color: COLORS.primary, short: 'ST'},
    Notice: {label: 'Notice', color: COLORS.primary, short: 'N'},
    Students: {label: 'Students', color: COLORS.primary, short: 'SU'},
    Income: {label: 'Income', color: COLORS.primary, short: 'I'},
    Placed: {label: 'Placed', color: COLORS.primary, short: 'PL'},
    References: {label: 'References', color: COLORS.primary, short: 'RF'},
  };

function TabIcon({routeName, focused}: {routeName: string; focused: boolean}) {
  const meta = TAB_META[routeName];
  return (
    <View style={styles.iconWrap}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: focused ? meta.color : `${meta.color}22`,
            borderColor: meta.color,
          },
        ]}>
        <Text style={[styles.iconText, focused && styles.iconTextFocused]}>
          {meta.short}
        </Text>
      </View>
    </View>
  );
}

function HubTabIcon({focused}: {focused: boolean}) {
  return <TabIcon routeName="Status" focused={focused} />;
}

function NoticeTabIcon({focused}: {focused: boolean}) {
  return <TabIcon routeName="Notice" focused={focused} />;
}

function StudentsTabIcon({focused}: {focused: boolean}) {
  return <TabIcon routeName="Students" focused={focused} />;
}

function IncomeTabIcon({focused}: {focused: boolean}) {
  return <TabIcon routeName="Income" focused={focused} />;
}

function PlacedTabIcon({focused}: {focused: boolean}) {
  return <TabIcon routeName="Placed" focused={focused} />;
}

function ReferenceTabIcon({focused}: {focused: boolean}) {
  return <TabIcon routeName="References" focused={focused} />;
}

export default function SuperAdminTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textGray,
        tabBarActiveBackgroundColor: COLORS.info,
        tabBarInactiveBackgroundColor: COLORS.white,
      }}>
      <Tab.Screen
        name="Status"
        component={SuperAdminHome}
        options={{tabBarIcon: HubTabIcon}}
      />
      <Tab.Screen
        name="Notice"
        component={SuperAdminNoticePublisher}
        options={{tabBarIcon: NoticeTabIcon}}
      />
      <Tab.Screen
        name="Students"
        component={SuperAdminStudentList}
        options={{tabBarIcon: StudentsTabIcon}}
      />
      <Tab.Screen
        name="Income"
        component={SuperAdminFinanceScreen}
        options={{tabBarIcon: IncomeTabIcon}}
      />
      <Tab.Screen
        name="Placed"
        children={() => <PlacedStudentsListScreen title="Placed Students" />}
        options={{tabBarIcon: PlacedTabIcon}}
      />
      <Tab.Screen
        name="References"
        children={() => <ReferenceScreen mode="list" />}
        options={{tabBarIcon: ReferenceTabIcon}}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 76,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabBarItem: {
    borderRadius: 12,
    marginHorizontal: 4,
    marginTop: 2,
    minHeight: 48,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: COLORS.textGray,
    fontSize: 14,
    fontWeight: '800',
  },
  iconTextFocused: {
    color: COLORS.white,
  },
});
