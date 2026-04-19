/**
 * DinnerPlans.ai - Stripe Product & Price Setup Script
 * 
 * Run this script to create all products and prices in your Stripe account.
 * 
 * Prerequisites:
 * 1. npm install stripe
 * 2. Set STRIPE_SECRET_KEY environment variable
 * 
 * Usage:
 * - Test mode: STRIPE_SECRET_KEY=sk_test_xxx node stripe-setup.js
 * - Live mode: STRIPE_SECRET_KEY=sk_live_xxx node stripe-setup.js
 */

const Stripe = require('stripe');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// ============================================================================
// PRODUCT & PRICE CONFIGURATION
// ============================================================================

const PRODUCTS = {
  // Subscription Products
  individual: {
    name: 'DinnerPlans Individual',
    description: 'For individuals and couples. Unlimited pantry, AI recipe suggestions, expiration tracking, and smart grocery lists.',
    metadata: {
      tier: 'individual',
      tokens_monthly: '100',
      household_limit: '1',
    },
  },
  family: {
    name: 'DinnerPlans Family',
    description: 'Best for families. Everything in Individual plus up to 6 members, weekly AI meal planning, per-person preferences, shared pantry, recipe scaling, and calendar sync.',
    metadata: {
      tier: 'family',
      tokens_monthly: '150',
      household_limit: '6',
    },
  },
  
  // One-time Products (Token Buckets)
  tokens_50: {
    name: 'AI Token Bucket - 50 Tokens',
    description: '50 AI tokens for DinnerPlans. Never expire.',
    metadata: {
      type: 'token_bucket',
      tokens: '50',
    },
  },
  tokens_150: {
    name: 'AI Token Bucket - 150 Tokens',
    description: '150 AI tokens for DinnerPlans. Never expire. Best per-token value!',
    metadata: {
      type: 'token_bucket',
      tokens: '150',
    },
  },
  tokens_400: {
    name: 'AI Token Bucket - 400 Tokens',
    description: '400 AI tokens for DinnerPlans. Never expire.',
    metadata: {
      type: 'token_bucket',
      tokens: '400',
    },
  },
};

const PRICES = {
  // Individual Prices
  individual_monthly: {
    product: 'individual',
    unit_amount: 999, // $9.99 in cents
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { billing_cycle: 'monthly' },
    lookup_key: 'individual_monthly',
  },
  individual_annual: {
    product: 'individual',
    unit_amount: 9900, // $99.00 in cents
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { billing_cycle: 'annual' },
    lookup_key: 'individual_annual',
  },
  
  // Family Prices
  family_monthly: {
    product: 'family',
    unit_amount: 1499, // $14.99 in cents
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { billing_cycle: 'monthly' },
    lookup_key: 'family_monthly',
  },
  family_annual: {
    product: 'family',
    unit_amount: 14900, // $149.00 in cents
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { billing_cycle: 'annual' },
    lookup_key: 'family_annual',
  },
  
  // Token Bucket Prices (one-time)
  tokens_50: {
    product: 'tokens_50',
    unit_amount: 199, // $1.99 in cents
    currency: 'usd',
    metadata: { type: 'token_bucket' },
    lookup_key: 'tokens_50',
  },
  tokens_150: {
    product: 'tokens_150',
    unit_amount: 499, // $4.99 in cents
    currency: 'usd',
    metadata: { type: 'token_bucket' },
    lookup_key: 'tokens_150',
  },
  tokens_400: {
    product: 'tokens_400',
    unit_amount: 999, // $9.99 in cents
    currency: 'usd',
    metadata: { type: 'token_bucket' },
    lookup_key: 'tokens_400',
  },
};

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

async function createProducts() {
  console.log('\n📦 Creating Products...\n');
  const createdProducts = {};
  
  for (const [key, productData] of Object.entries(PRODUCTS)) {
    try {
      // Check if product already exists by searching
      const existingProducts = await stripe.products.search({
        query: `name:'${productData.name}'`,
      });
      
      if (existingProducts.data.length > 0) {
        console.log(`  ⏭️  Product "${productData.name}" already exists (${existingProducts.data[0].id})`);
        createdProducts[key] = existingProducts.data[0];
        continue;
      }
      
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: productData.metadata,
      });
      
      console.log(`  ✅ Created: ${productData.name} (${product.id})`);
      createdProducts[key] = product;
    } catch (error) {
      console.error(`  ❌ Error creating ${productData.name}:`, error.message);
    }
  }
  
  return createdProducts;
}

async function createPrices(products) {
  console.log('\n💰 Creating Prices...\n');
  const createdPrices = {};
  
  for (const [key, priceData] of Object.entries(PRICES)) {
    try {
      const product = products[priceData.product];
      if (!product) {
        console.error(`  ❌ Product not found for price: ${key}`);
        continue;
      }
      
      // Check if price with this lookup_key already exists
      const existingPrices = await stripe.prices.list({
        product: product.id,
        lookup_keys: [priceData.lookup_key],
      });
      
      if (existingPrices.data.length > 0) {
        console.log(`  ⏭️  Price "${priceData.lookup_key}" already exists (${existingPrices.data[0].id})`);
        createdPrices[key] = existingPrices.data[0];
        continue;
      }
      
      const priceConfig = {
        product: product.id,
        unit_amount: priceData.unit_amount,
        currency: priceData.currency,
        metadata: priceData.metadata,
        lookup_key: priceData.lookup_key,
      };
      
      // Add recurring config for subscriptions
      if (priceData.recurring) {
        priceConfig.recurring = priceData.recurring;
      }
      
      const price = await stripe.prices.create(priceConfig);
      
      const priceDisplay = (priceData.unit_amount / 100).toFixed(2);
      const interval = priceData.recurring ? `/${priceData.recurring.interval}` : ' (one-time)';
      console.log(`  ✅ Created: $${priceDisplay}${interval} for ${products[priceData.product].name} (${price.id})`);
      createdPrices[key] = price;
    } catch (error) {
      console.error(`  ❌ Error creating price ${key}:`, error.message);
    }
  }
  
  return createdPrices;
}

async function configureCustomerPortal() {
  console.log('\n⚙️  Configuring Customer Portal...\n');
  
  try {
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your DinnerPlans subscription',
        privacy_policy_url: 'https://dinnerplans.ai/privacy',
        terms_of_service_url: 'https://dinnerplans.ai/terms',
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'name', 'address'],
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other',
            ],
          },
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [], // Will be populated after products are created
        },
      },
    });
    
    console.log(`  ✅ Customer Portal configured (${configuration.id})`);
    return configuration;
  } catch (error) {
    console.error(`  ❌ Error configuring Customer Portal:`, error.message);
  }
}

async function createWebhookEndpoint(webhookUrl) {
  console.log('\n🔗 Creating Webhook Endpoint...\n');
  
  if (!webhookUrl) {
    console.log('  ⏭️  Skipping webhook creation (no URL provided)');
    console.log('     Set WEBHOOK_URL environment variable to create webhook');
    return;
  }
  
  try {
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'customer.subscription.trial_will_end',
        'invoice.paid',
        'invoice.payment_failed',
        'invoice.payment_action_required',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
      ],
      description: 'DinnerPlans subscription events',
    });
    
    console.log(`  ✅ Webhook endpoint created (${webhook.id})`);
    console.log(`  🔑 Webhook signing secret: ${webhook.secret}`);
    console.log('     ⚠️  Save this secret! You won\'t be able to see it again.');
    return webhook;
  } catch (error) {
    console.error(`  ❌ Error creating webhook:`, error.message);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DinnerPlans.ai - Stripe Setup Script');
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Check for API key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('\n❌ Error: STRIPE_SECRET_KEY environment variable is required');
    console.log('\nUsage:');
    console.log('  STRIPE_SECRET_KEY=sk_test_xxx node stripe-setup.js');
    process.exit(1);
  }
  
  // Detect mode
  const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
  console.log(`\n🔧 Mode: ${isTestMode ? 'TEST' : '⚠️  LIVE'}`);
  
  if (!isTestMode) {
    console.log('\n⚠️  WARNING: You are using a LIVE API key!');
    console.log('   This will create real products and prices.');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  try {
    // Step 1: Create Products
    const products = await createProducts();
    
    // Step 2: Create Prices
    const prices = await createPrices(products);
    
    // Step 3: Configure Customer Portal
    await configureCustomerPortal();
    
    // Step 4: Create Webhook (optional)
    const webhookUrl = process.env.WEBHOOK_URL;
    await createWebhookEndpoint(webhookUrl);
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Setup Complete! Here are your IDs:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('Products:');
    for (const [key, product] of Object.entries(products)) {
      console.log(`  ${key}: ${product.id}`);
    }
    
    console.log('\nPrices (use these in your app):');
    for (const [key, price] of Object.entries(prices)) {
      console.log(`  ${key}: ${price.id}`);
    }
    
    console.log('\n📋 Copy these to your environment variables:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`STRIPE_PRICE_INDIVIDUAL_MONTHLY=${prices.individual_monthly?.id || 'ERROR'}`);
    console.log(`STRIPE_PRICE_INDIVIDUAL_ANNUAL=${prices.individual_annual?.id || 'ERROR'}`);
    console.log(`STRIPE_PRICE_FAMILY_MONTHLY=${prices.family_monthly?.id || 'ERROR'}`);
    console.log(`STRIPE_PRICE_FAMILY_ANNUAL=${prices.family_annual?.id || 'ERROR'}`);
    console.log(`STRIPE_PRICE_TOKENS_50=${prices.tokens_50?.id || 'ERROR'}`);
    console.log(`STRIPE_PRICE_TOKENS_150=${prices.tokens_150?.id || 'ERROR'}`);
    console.log(`STRIPE_PRICE_TOKENS_400=${prices.tokens_400?.id || 'ERROR'}`);
    console.log('───────────────────────────────────────────────────────────────\n');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
