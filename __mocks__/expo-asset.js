/**
 * Mock for expo-asset
 */
module.exports = {
  Asset: {
    loadAsync: jest.fn(() => Promise.resolve()),
    fromModule: jest.fn(() => ({ uri: 'mock-asset', localUri: 'mock-local' })),
    fromURI: jest.fn(() => ({ uri: 'mock-asset' })),
  },
};

