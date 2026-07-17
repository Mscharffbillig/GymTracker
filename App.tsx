import React from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import { AppDataProvider, useAppData } from './src/context/AppDataContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ConsentModal } from './src/components/ConsentModal';
import { darkColors } from './src/theme';
import { isDiagnosticsConsented } from './src/diagnostics';

// Sentry is initialized disabled. Events are gated by isDiagnosticsConsented() in
// beforeSend/beforeBreadcrumb so nothing is transmitted before the user grants consent.
// AppDataContext calls setDiagnosticsConsent() once settings load (and again on change).
Sentry.init({
  dsn: 'https://707563a09a704d3cb86db22b46a7eed8@o4511701032108032.ingest.us.sentry.io/4511701522186240',
  enabled: !__DEV__,
  tracesSampleRate: 0,    // no performance tracing
  sendDefaultPii: false,  // no automatic user identifiers
  beforeSend(event) {
    if (!isDiagnosticsConsented()) return null;
    // Strip navigation context (may contain route params with opaque IDs)
    if (event.contexts?.['react_navigation']) {
      delete event.contexts['react_navigation'];
    }
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (!isDiagnosticsConsented()) return null;
    // Navigation breadcrumbs may contain route params; strip them entirely
    if (breadcrumb.category === 'navigation') return null;
    return breadcrumb;
  },
});

function AppContent() {
  const { loading, colors, settings, updateSettings } = useAppData();

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
      <ConsentModal
        visible={settings.analyticsEnabled === 'undecided'}
        onAllow={() => updateSettings({ ...settings, analyticsEnabled: 'allowed' })}
        onDecline={() => updateSettings({ ...settings, analyticsEnabled: 'declined' })}
      />
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

export default Sentry.wrap(App);
