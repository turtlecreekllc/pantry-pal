const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = require(appJsonPath);

// Increment build number (iOS)
if (appJson.expo.ios && appJson.expo.ios.buildNumber) {
  const currentBuildNumber = parseInt(appJson.expo.ios.buildNumber, 10);
  appJson.expo.ios.buildNumber = (currentBuildNumber + 1).toString();
  console.log(`Incremented iOS buildNumber to ${appJson.expo.ios.buildNumber}`);
}

// Increment version code (Android)
if (appJson.expo.android && appJson.expo.android.versionCode) {
  appJson.expo.android.versionCode += 1;
  console.log(`Incremented Android versionCode to ${appJson.expo.android.versionCode}`);
}

// Increment version (Patch)
if (appJson.expo.version) {
  const parts = appJson.expo.version.split('.');
  if (parts.length === 3) {
    parts[2] = (parseInt(parts[2], 10) + 1).toString();
    appJson.expo.version = parts.join('.');
    console.log(`Incremented version to ${appJson.expo.version}`);
  }
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log('Updated app.json');

