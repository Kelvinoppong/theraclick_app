/**
 * Config plugin to fix AndroidManifest merge conflicts between
 * expo-notifications and @react-native-firebase/messaging.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withFirebaseMessagingManifest(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const manifestPath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "AndroidManifest.xml"
      );

      let manifest = fs.readFileSync(manifestPath, "utf-8");

      // Add tools namespace if missing
      if (!manifest.includes("xmlns:tools")) {
        manifest = manifest.replace(
          "<manifest ",
          '<manifest xmlns:tools="http://schemas.android.com/tools" '
        );
      }

      // Add tools:replace to the notification channel meta-data
      manifest = manifest.replace(
        /(<meta-data\s+android:name="com\.google\.firebase\.messaging\.default_notification_channel_id")/g,
        '$1 tools:replace="android:value"'
      );

      // Add tools:replace to the notification color meta-data
      manifest = manifest.replace(
        /(<meta-data\s+android:name="com\.google\.firebase\.messaging\.default_notification_color")/g,
        '$1 tools:replace="android:resource"'
      );

      fs.writeFileSync(manifestPath, manifest);
      console.log("[withFirebaseMessagingManifest] Patched AndroidManifest.xml");

      return config;
    },
  ]);
};
