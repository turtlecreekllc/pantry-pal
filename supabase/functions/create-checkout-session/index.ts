/**
 * Create Checkout Session
 * Supabase Edge Function to create Stripe Checkout sessions
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('=== create-checkout-session invoked ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Log environment check
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:');
    console.log('- STRIPE_SECRET_KEY:', stripeKey ? 'SET' : 'NOT SET');
    console.log('- SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'NOT SET');

    // Parse request body
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));

    const { userId, priceId, mode, successUrl, cancelUrl } = body;

    if (!userId || !priceId || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters', received: { userId: !!userId, priceId: !!priceId, successUrl: !!successUrl, cancelUrl: !!cancelUrl } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Import Stripe dynamically to avoid startup crashes
    const { default: Stripe } = await import('https://esm.sh/stripe@14.14.0?target=deno');
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Import Supabase dynamically
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Get or create Stripe customer
    let customerId: string;
    
    console.log('Looking up subscription for user:', userId);
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subError) {
      console.log('Subscription lookup result:', subError.message);
    }

    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id;
      console.log('Using existing Stripe customer:', customerId);
    } else {
      // Get user email
      console.log('Getting user email...');
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      if (userError || !userData.user?.email) {
        console.error('User lookup failed:', userError?.message || 'No email');
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create Stripe customer
      console.log('Creating Stripe customer for:', userData.user.email);
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      console.log('Created Stripe customer:', customerId);

      // Save customer ID
      await supabase
        .from('subscriptions')
        .upsert({ 
          user_id: userId, 
          stripe_customer_id: customerId,
          tier: 'free',
          status: 'active'
        }, { onConflict: 'user_id' });
    }

    // Create checkout session
    console.log('Creating checkout session with price:', priceId);
    const sessionParams: any = {
      customer: customerId,
      mode: mode || 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: userId },
    };

    if (mode === 'subscription') {
      sessionParams.subscription_data = { metadata: { user_id: userId } };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Error:', err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
