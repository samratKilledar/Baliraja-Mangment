import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/common/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SuperAdminTabNavigator from './SuperAdminTabNavigator';
import AdminTabNavigator from './AdminTabNavigator';
import TeacherTabNavigator from './TeacherTabNavigator';
import ParentHome from '../screens/parent/ParentHome';
import {useAuth} from '../context/AuthContext';
import StudentTabNavigator from './StudentTabNavigator';
import LoadingOverlay from '../components/LoadingOverlay';
import SplashGate from '../components/SplashGate';
import ForcePasswordChangeScreen from '../screens/common/ForcePasswordChangeScreen';

const Stack = createNativeStackNavigator();

function RoleScreen({role}: {role: string}) {
  if (role === 'super_admin') {
    return <SuperAdminTabNavigator />;
  }
  if (role === 'admin') {
    return <AdminTabNavigator />;
  }
  if (role === 'teacher') {
    return <TeacherTabNavigator />;
  }
  if (role === 'student') {
    return <StudentTabNavigator />;
  }
  return <ParentHome />;
}

export default function RootNavigator() {
  const {user, hydrated} = useAuth();

  return (
    <SplashGate appReady={hydrated}>
      {!hydrated ? (
        <LoadingOverlay visible text="Restoring session..." />
      ) : (
        <Stack.Navigator screenOptions={{headerShown: false}}>
          {!user ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : user.role === 'teacher' && user.mustChangePassword ? (
            <Stack.Screen
              name="ForcePasswordChange"
              component={ForcePasswordChangeScreen}
            />
          ) : (
            <Stack.Screen name="Home">
              {() => <RoleScreen role={user.role} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      )}
    </SplashGate>
  );
}
