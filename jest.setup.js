/**
 * Jest Setup File
 * Configures mocks and global setup for tests
 */

import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Link: ({ children }) => children,
  Redirect: () => null,
}));

// Mock Supabase client with fully chainable query builder
// This creates a self-referencing chainable mock that supports all Supabase query patterns
const createChainableQueryBuilder = (defaultData = [], defaultError = null) => {
  // Create a builder object with all methods returning itself
  const builder = {};
  
  // All query methods that return the builder for chaining
  const chainableMethods = [
    'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 
    'like', 'ilike', 'is', 'in', 'contains', 'containedBy',
    'order', 'limit', 'range', 'filter', 'match', 'not',
    'or', 'textSearch'
  ];
  
  chainableMethods.forEach(method => {
    builder[method] = jest.fn(() => builder);
  });
  
  // Terminal methods that resolve the query
  builder.single = jest.fn(() => Promise.resolve({ 
    data: Array.isArray(defaultData) ? defaultData[0] : defaultData || null, 
    error: defaultError 
  }));
  builder.maybeSingle = jest.fn(() => Promise.resolve({ 
    data: Array.isArray(defaultData) ? defaultData[0] : defaultData || null, 
    error: defaultError 
  }));
  
  // Make the builder thenable so it can be awaited
  builder.then = function(resolve, reject) {
    const result = { data: defaultData, error: defaultError };
    return Promise.resolve(result).then(resolve, reject);
  };
  
  // Allow catch for error handling
  builder.catch = function(reject) {
    return Promise.resolve({ data: defaultData, error: defaultError }).catch(reject);
  };
  
  return builder;
};

const createMutationBuilder = (defaultData = { id: 'mock-id' }, defaultError = null) => {
  const builder = {};
  
  // Mutation chainable methods
  const chainableMethods = ['select', 'eq', 'neq', 'match', 'in'];
  
  chainableMethods.forEach(method => {
    builder[method] = jest.fn(() => builder);
  });
  
  builder.single = jest.fn(() => Promise.resolve({ data: defaultData, error: defaultError }));
  builder.maybeSingle = jest.fn(() => Promise.resolve({ data: defaultData, error: defaultError }));
  
  builder.then = function(resolve, reject) {
    return Promise.resolve({ data: defaultData, error: defaultError }).then(resolve, reject);
  };
  
  builder.catch = function(reject) {
    return Promise.resolve({ data: defaultData, error: defaultError }).catch(reject);
  };
  
  return builder;
};

jest.mock('./lib/supabase', () => {
  // Store mock data that tests can modify
  const mockData = {
    pantry_items: [],
    user_preferences: null,
    profiles: null,
  };
  
  return {
    supabase: {
      auth: {
        getSession: jest.fn(() => Promise.resolve({ 
          data: { 
            session: { 
              user: { id: 'test-user-id', email: 'test@example.com' } 
            } 
          }, 
          error: null 
        })),
        signInWithPassword: jest.fn(() => Promise.resolve({ 
          data: { user: { id: 'test-user-id' } }, 
          error: null 
        })),
        signUp: jest.fn(() => Promise.resolve({ 
          data: { user: { id: 'test-user-id' } }, 
          error: null 
        })),
        signOut: jest.fn(() => Promise.resolve({ error: null })),
        onAuthStateChange: jest.fn((callback) => {
          // Immediately call with a signed-in user to simulate existing session
          setTimeout(() => {
            callback('SIGNED_IN', { 
              user: { id: 'test-user-id', email: 'test@example.com' } 
            });
          }, 0);
          return { data: { subscription: { unsubscribe: jest.fn() } } };
        }),
      },
      from: jest.fn((table) => {
        const builder = createChainableQueryBuilder(mockData[table] || []);
        
        return {
          select: jest.fn(() => builder),
          insert: jest.fn((data) => {
            // Store inserted data for retrieval
            if (table === 'pantry_items') {
              const newItem = { id: `mock-${Date.now()}`, ...data };
              mockData.pantry_items.push(newItem);
              return createMutationBuilder(newItem);
            }
            return createMutationBuilder({ id: `mock-${Date.now()}`, ...data });
          }),
          update: jest.fn((data) => createMutationBuilder({ ...data, id: 'mock-id' })),
          upsert: jest.fn((data) => createMutationBuilder({ ...data, id: 'mock-id' })),
          delete: jest.fn(() => {
            const deleteBuilder = {};
            deleteBuilder.eq = jest.fn(() => Promise.resolve({ data: null, error: null }));
            deleteBuilder.in = jest.fn(() => Promise.resolve({ data: null, error: null }));
            deleteBuilder.then = (resolve) => Promise.resolve({ data: null, error: null }).then(resolve);
            return deleteBuilder;
          }),
        };
      }),
      channel: jest.fn(() => ({
        on: jest.fn(function() { return this; }),
        subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      })),
      removeChannel: jest.fn(),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
    // Export mock data setter for tests to use
    __setMockData: (table, data) => {
      mockData[table] = data;
    },
    __getMockData: () => mockData,
  };
});

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => 
      Promise.resolve({ status: 'granted' })
    ),
  },
  CameraView: 'CameraView',
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  requestCameraPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock react-native-iap for Apple IAP testing
jest.mock('react-native-iap', () => ({
  initConnection: jest.fn(() => Promise.resolve(true)),
  endConnection: jest.fn(() => Promise.resolve()),
  getProducts: jest.fn(() => Promise.resolve([
    {
      productId: 'com.turtlecreekllc.dinnerplans.tokens.50',
      title: '50 AI Tokens',
      description: 'Token pack for AI features',
      price: '1.99',
      localizedPrice: '$1.99',
      currency: 'USD',
    },
    {
      productId: 'com.turtlecreekllc.dinnerplans.tokens.150',
      title: '150 AI Tokens',
      description: 'Token pack for AI features',
      price: '4.99',
      localizedPrice: '$4.99',
      currency: 'USD',
    },
  ])),
  getSubscriptions: jest.fn(() => Promise.resolve([
    {
      productId: 'com.turtlecreekllc.dinnerplans.premium.monthly',
      title: 'Premium Monthly',
      description: 'Monthly premium subscription',
      price: '6.99',
      localizedPrice: '$6.99',
      currency: 'USD',
      subscriptionPeriodUnitIOS: 'MONTH',
      subscriptionPeriodNumberIOS: 1,
    },
    {
      productId: 'com.turtlecreekllc.dinnerplans.premium.annual',
      title: 'Premium Annual',
      description: 'Annual premium subscription',
      price: '69.00',
      localizedPrice: '$69.00',
      currency: 'USD',
      subscriptionPeriodUnitIOS: 'YEAR',
      subscriptionPeriodNumberIOS: 1,
    },
  ])),
  requestPurchase: jest.fn(() => Promise.resolve({
    productId: 'com.turtlecreekllc.dinnerplans.tokens.50',
    transactionId: 'mock-transaction-123',
    transactionDate: Date.now(),
  })),
  requestSubscription: jest.fn(() => Promise.resolve({
    productId: 'com.turtlecreekllc.dinnerplans.premium.monthly',
    transactionId: 'mock-sub-transaction-123',
    originalTransactionIdIOS: 'mock-original-123',
    transactionDate: Date.now(),
  })),
  finishTransaction: jest.fn(() => Promise.resolve()),
  getPurchaseHistory: jest.fn(() => Promise.resolve([])),
  getAvailablePurchases: jest.fn(() => Promise.resolve([])),
  flushFailedPurchasesCachedAsPendingAndroid: jest.fn(() => Promise.resolve()),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock expo-web-browser for Stripe checkout
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
  dismissBrowser: jest.fn(() => Promise.resolve()),
}));

// Silence console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0]?.includes?.('Animated') ||
    args[0]?.includes?.('componentWillReceiveProps') ||
    args[0]?.includes?.('componentWillMount')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Global test timeout
jest.setTimeout(10000);

