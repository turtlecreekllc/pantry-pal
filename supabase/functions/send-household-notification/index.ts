/**
 * Send Household Notification
 * Supabase Edge Function to send push notifications to household members
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationPayload {
  householdId: string;
  actorUserId: string;
  actionType: string;
  actionData: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
  channelId?: string;
}

/**
 * Formats activity into user-friendly notification
 */
function formatActivityNotification(
  actionType: string,
  actionData: Record<string, unknown>,
  actorName: string
): { title: string; body: string } | null {
  switch (actionType) {
    case 'member_joined':
      return {
        title: 'New Household Member',
        body: `${actorName} joined your household`,
      };
    case 'item_added':
      return {
        title: 'Pantry Updated',
        body: `${actorName} added ${actionData.item_name || 'an item'} to the pantry`,
      };
    case 'meal_planned':
      return {
        title: 'New Meal Planned',
        body: `${actorName} planned ${actionData.recipe_name || 'a meal'} for ${actionData.meal_type || 'a meal'}`,
      };
    case 'meal_completed':
      return {
        title: 'Meal Completed',
        body: `${actorName} marked ${actionData.recipe_name || 'a meal'} as complete`,
      };
    case 'item_updated':
      return null; // Too frequent, skip
    case 'item_deleted':
      return null; // Not important enough
    case 'member_left':
      return {
        title: 'Member Left',
        body: `${actorName} left the household`,
      };
    default:
      return null;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const payload: NotificationPayload = await req.json();
    const { householdId, actorUserId, actionType, actionData } = payload;

    if (!householdId || !actorUserId || !actionType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get actor's name for the notification
    const { data: actorData } = await supabase.auth.admin.getUserById(actorUserId);
    const actorName = actorData?.user?.user_metadata?.first_name || 
                      actorData?.user?.email?.split('@')[0] || 
                      'Someone';

    // Format notification
    const notification = formatActivityNotification(actionType, actionData, actorName);
    if (!notification) {
      return new Response(
        JSON.stringify({ message: 'Activity type does not require notification' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get push tokens for all household members EXCEPT the actor
    const { data: tokens, error: tokensError } = await supabase.rpc(
      'get_household_push_tokens',
      { p_household_id: householdId }
    );

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter out the actor and users who have household notifications disabled
    const recipientTokens: string[] = [];
    for (const tokenData of tokens || []) {
      if (tokenData.user_id === actorUserId) continue;
      
      // Check if user has household notifications enabled
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('household_activity')
        .eq('user_id', tokenData.user_id)
        .single();
      
      // Default to true if no preferences set
      if (prefs?.household_activity === false) continue;
      
      recipientTokens.push(tokenData.token);
    }

    if (recipientTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipients to notify' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build Expo push messages
    const messages: ExpoPushMessage[] = recipientTokens.map((token) => ({
      to: token,
      title: notification.title,
      body: notification.body,
      data: {
        type: actionType,
        householdId,
        ...actionData,
      },
      sound: 'default',
      channelId: 'household',
    }));

    // Send to Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        sent: recipientTokens.length,
        result,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

