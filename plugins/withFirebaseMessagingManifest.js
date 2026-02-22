/**
 * Config plugin to fix AndroidManifest merge conflicts between
 * expo-notifications and @react-native-firebase/messaging.
 *
 * Both declare the same <meta-data> keys for default_notification_channel_id
 * and default_notification_color. This plugin adds tools:replace so the
 * app-level values win.
 */
const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withFirebaseMessagingManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return config;

    const TOOLS_NS = "http://schemas.android.com/tools";
    manifest.manifest.$["xmlns:tools"] = TOOLS_NS;

    const metaData = app["meta-data"] || [];

    for (const meta of metaData) {
      const name = meta.$["android:name"];

      if (name === "com.google.firebase.messaging.default_notification_channel_id") {
        meta.$["tools:replace"] = "android:value";
      }

      if (name === "com.google.firebase.messaging.default_notification_color") {
        meta.$["tools:replace"] = "android:resource";
      }
    }

    return config;
  });
};
