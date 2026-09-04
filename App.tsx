import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BreachOverlay } from './src/components/BreachOverlay';
import RootNavigator from './src/navigation/RootNavigator';
import { useBreachNotifications } from './src/store/useBreachNotifications';
import { useSyncAccountStatuses } from './src/store/useSyncAccountStatuses';
import { useStore } from './src/store/useStore';
import { colors } from './src/theme/theme';

export default function App() {
  const hasHydrated = useStore((s) => s.hasHydrated);
  const [fontsLoaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    SpaceMono_700Bold,
  });

  useSyncAccountStatuses();
  useBreachNotifications();

  if (!fontsLoaded || !hasHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.safe} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootNavigator />
        <BreachOverlay />
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
