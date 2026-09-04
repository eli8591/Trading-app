import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text } from 'react-native';
import AccountsScreen from '../screens/AccountsScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LogTradeScreen from '../screens/LogTradeScreen';
import { colors } from '../theme/theme';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, string> = {
  Dashboard: '◎',
  LogTrade: '＋',
  History: '▤',
  Accounts: '☰',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.safe,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopColor: colors.surfaceBorder,
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 18 }}>{ICONS[route.name as keyof MainTabParamList]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="LogTrade" component={LogTradeScreen} options={{ title: 'Log Trade' }} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
    </Tab.Navigator>
  );
}
