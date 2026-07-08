import React from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import { AppDataProvider, useAppData } from './src/context/AppDataContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { darkColors } from './src/theme';

Sentry.init({
  dsn: 'https://707563a09a704d3cb86db22b46a7eed8@o4511701032108032.ingest.us.sentry.io/4511701522186240',
  // Only report in production builds, not during local dev
  enabled: !__DEV__,
  // Capture 20% of transactions for performance monitoring
  tracesSampleRate: 0.2,
});

function AppContent() {
  const { loading, colors, settings } = useAppData();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: darkColors.background,
        }}
      >
        <ActivityIndicator size="large" color={darkColors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={settings.theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppDataProvider>
          <AppContent />
        </AppDataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap instruments the root component for automatic crash boundaries
export default Sentry.wrap(App);
