/**
 * Expo Config Plugin for Siri Shortcuts Integration
 * 
 * This plugin adds the necessary iOS entitlements and Info.plist entries
 * to enable Siri Shortcuts in the Dinner Plans app.
 * 
 * Usage in app.json:
 * {
 *   "plugins": [
 *     "./plugins/withSiriShortcuts"
 *   ]
 * }
 */

const { withInfoPlist, withEntitlementsPlist, withXcodeProject } = require('@expo/config-plugins');

/**
 * Add Siri capability to the iOS app
 */
const withSiriShortcuts = (config) => {
  // Step 1: Add Siri entitlement
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.siri'] = true;
    return config;
  });

  // Step 2: Add Siri usage description to Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSiriUsageDescription = 
      'Dinner Plans uses Siri to help you manage your pantry with voice commands like "Add milk to my pantry" or "What\'s expiring soon?"';
    
    // Add NSUserActivityTypes for the shortcut activities
    config.modResults.NSUserActivityTypes = [
      'com.turtlecreekllc.dinnerplans.addItem',
      'com.turtlecreekllc.dinnerplans.viewPantry',
      'com.turtlecreekllc.dinnerplans.viewExpiring',
      'com.turtlecreekllc.dinnerplans.scanPantry',
      'com.turtlecreekllc.dinnerplans.viewRecipes',
      'com.turtlecreekllc.dinnerplans.addGrocery',
      'com.turtlecreekllc.dinnerplans.voiceReview',
    ];
    
    return config;
  });

  return config;
};

module.exports = withSiriShortcuts;

