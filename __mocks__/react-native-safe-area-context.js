/**
 * Mock for react-native-safe-area-context
 */
const React = require('react');

module.exports = {
  SafeAreaView: ({ children, ...props }) => React.createElement('View', props, children),
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
};

