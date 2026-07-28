const { withAndroidManifest } = require('@expo/config-plugins');

// Extends app.json — Expo merges both automatically.
module.exports = ({ config }) => {
  return withAndroidManifest(config, (mod) => {
    const permissions = mod.modResults.manifest['uses-permission'] ?? [];
    // SYSTEM_ALERT_WINDOW is added by expo-dev-client for the dev overlay.
    // Not needed in production and triggers Play Store review questions.
    mod.modResults.manifest['uses-permission'] = permissions.filter(
      (p) => p.$['android:name'] !== 'android.permission.SYSTEM_ALERT_WINDOW'
    );
    return mod;
  });
};
