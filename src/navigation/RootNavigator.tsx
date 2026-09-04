import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AddAccountScreen from '../screens/AddAccountScreen';
import { useStore } from '../store/useStore';
import { colors } from '../theme/theme';
import MainTabs from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.backgroundElevated,
    border: colors.surfaceBorder,
    primary: colors.safe,
    text: colors.textPrimary,
  },
};

export default function RootNavigator() {
  const hasAccounts = useStore((s) => s.accounts.length > 0);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={hasAccounts ? 'Main' : 'AddAccount'}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="AddAccount"
          component={AddAccountScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
