import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin access
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is support/admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_support')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_support) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create FireGram system profile
    let { data: systemProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'FireGram')
      .single();

    if (!systemProfile) {
      // Create system profile if it doesn't exist
      const systemId = '00000000-0000-0000-0000-000000000000';
      const { error: createError } = await supabase
        .from('profiles')
        .upsert({
          id: systemId,
          username: 'FireGram',
          full_name: 'FireGram Official',
          avatar_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=FireGram',
          is_verified: true,
        }, { onConflict: 'id' });

      if (createError) {
        console.error('Error creating system profile:', createError);
      }
      
      systemProfile = { id: systemId };
    }

    // Get all user IDs
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id');

    if (usersError) {
      throw usersError;
    }

    // Create notifications for all users
    const notifications = users
      .filter(u => u.id !== systemProfile.id) // Don't send to system account
      .map(u => ({
        user_id: u.id,
        type: 'announcement',
        from_user_id: systemProfile.id,
        message: message,
      }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      throw notificationError;
    }

    console.log(`Announcement sent to ${notifications.length} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Announcement sent to ${notifications.length} users` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending announcement:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
