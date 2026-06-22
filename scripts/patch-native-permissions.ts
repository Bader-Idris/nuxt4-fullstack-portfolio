import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const androidManifestPath = join(process.cwd(), "android/app/src/main/AndroidManifest.xml");
const iosPlistPath = join(process.cwd(), "ios/App/App/Info.plist");

console.log("Checking and patching native platform configurations...");

// 1. Patch Android Manifest
if (existsSync(androidManifestPath)) {
  console.log("AndroidManifest.xml found, checking permissions...");
  let content = readFileSync(androidManifestPath, "utf8");
  let modified = false;

  const permissions = [
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS"
  ];

  permissions.forEach(perm => {
    if (!content.includes(perm)) {
      console.log(`Adding Android permission: ${perm}`);
      const internetPermissionStr = '<uses-permission android:name="android.permission.INTERNET" />';
      if (content.includes(internetPermissionStr)) {
        content = content.replace(
          internetPermissionStr,
          `${internetPermissionStr}\n    <uses-permission android:name="${perm}" />`
        );
      } else {
        content = content.replace(
          "</manifest>",
          `    <uses-permission android:name="${perm}" />\n</manifest>`
        );
      }
      modified = true;
    }
  });

  const features = [
    '<uses-feature android:name="android.hardware.camera" android:required="false" />',
    '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />'
  ];

  features.forEach(feat => {
    const featNameMatch = feat.match(/android:name="([^"]+)"/);
    if (featNameMatch && featNameMatch[1]) {
      const featName = featNameMatch[1];
      if (!content.includes(featName)) {
        console.log(`Adding Android feature: ${featName}`);
        content = content.replace("</manifest>", `    ${feat}\n</manifest>`);
        modified = true;
      }
    }
  });

  if (modified) {
    writeFileSync(androidManifestPath, content, "utf8");
    console.log("AndroidManifest.xml successfully patched.");
  } else {
    console.log("AndroidManifest.xml permissions are already up-to-date.");
  }
} else {
  console.log("AndroidManifest.xml not found. Skipping Android patch.");
}

// 2. Patch iOS Info.plist
if (existsSync(iosPlistPath)) {
  console.log("Info.plist found, checking descriptions...");
  let content = readFileSync(iosPlistPath, "utf8");
  let modified = false;

  if (!content.includes("NSCameraUsageDescription")) {
    console.log("Adding iOS NSCameraUsageDescription...");
    // Replace the last </dict> in plist before </plist>
    content = content.replace(
      /<\/dict>\s*<\/plist>/s,
      `\t<key>NSCameraUsageDescription</key>\n\t<string>This app requires camera access to make video calls.</string>\n</dict>\n</plist>`
    );
    modified = true;
  }

  if (!content.includes("NSMicrophoneUsageDescription")) {
    console.log("Adding iOS NSMicrophoneUsageDescription...");
    content = content.replace(
      /<\/dict>\s*<\/plist>/s,
      `\t<key>NSMicrophoneUsageDescription</key>\n\t<string>This app requires microphone access to make voice/video calls.</string>\n</dict>\n</plist>`
    );
    modified = true;
  }

  if (modified) {
    writeFileSync(iosPlistPath, content, "utf8");
    console.log("Info.plist successfully patched.");
  } else {
    console.log("Info.plist descriptions are already up-to-date.");
  }
} else {
  console.log("Info.plist not found. Skipping iOS patch.");
}

console.log("Native platform configuration checks complete.");
