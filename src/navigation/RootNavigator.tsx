import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../context/AppDataContext';
import {
  BodyStackParamList,
  ProgramStackParamList,
  ProgressStackParamList,
  RootTabParamList,
  SettingsStackParamList,
} from './types';
import { DaysListScreen } from '../screens/DaysListScreen';
import { DayDetailScreen } from '../screens/DayDetailScreen';
import { ExercisePickerScreen } from '../screens/ExercisePickerScreen';
import { WorkoutSessionScreen } from '../screens/WorkoutSessionScreen';
import { ExerciseHistoryScreen } from '../screens/ExerciseHistoryScreen';
import { WorkoutLogScreen } from '../screens/WorkoutLogScreen';
import { BodyMapScreen } from '../screens/BodyMapScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const ProgramStack = createNativeStackNavigator<ProgramStackParamList>();
const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();
const BodyStack = createNativeStackNavigator<BodyStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function ProgramStackNavigator() {
  const { colors } = useAppData();
  return (
    <ProgramStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ProgramStack.Screen name="Days" component={DaysListScreen} options={{ headerShown: false }} />
      <ProgramStack.Screen name="DayDetail" component={DayDetailScreen} options={{ title: 'Day' }} />
      <ProgramStack.Screen
        name="ExercisePicker"
        component={ExercisePickerScreen}
        options={{ title: 'Add Exercise' }}
      />
      <ProgramStack.Screen
        name="WorkoutSession"
        component={WorkoutSessionScreen}
        options={{ title: 'Log Workout' }}
      />
      <ProgramStack.Screen
        name="ExerciseHistory"
        component={ExerciseHistoryScreen}
        options={{ title: 'History' }}
      />
    </ProgramStack.Navigator>
  );
}

function ProgressStackNavigator() {
  const { colors } = useAppData();
  return (
    <ProgressStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ProgressStack.Screen
        name="WorkoutLog"
        component={WorkoutLogScreen}
        options={{ headerShown: false }}
      />
      <ProgressStack.Screen
        name="ExerciseHistory"
        component={ExerciseHistoryScreen}
        options={{ title: 'History' }}
      />
    </ProgressStack.Navigator>
  );
}

function BodyStackNavigator() {
  const { colors } = useAppData();
  return (
    <BodyStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <BodyStack.Screen
        name="BodyMap"
        component={BodyMapScreen}
        options={{ headerShown: false }}
      />
    </BodyStack.Navigator>
  );
}

function SettingsStackNavigator() {
  const { colors } = useAppData();
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
    </SettingsStack.Navigator>
  );
}

export function RootNavigator() {
  const { colors } = useAppData();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="ProgramTab"
        component={ProgramStackNavigator}
        options={{
          title: 'Program',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressStackNavigator}
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BodyTab"
        component={BodyStackNavigator}
        options={{
          title: 'Body',
          tabBarIcon: ({ color, size }) => <Ionicons name="body-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
