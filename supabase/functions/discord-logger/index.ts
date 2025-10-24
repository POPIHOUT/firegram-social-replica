import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LogPayload {
  action: string;
  user_id?: string;
  username?: string;
  target_user_id?: string;
  target_username?: string;
  details?: Record<string, any>;
  admin_id?: string;
  admin_username?: string;
}

async function processLogs() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get unsent logs
  const { data: logs, error } = await supabase
    .from('discord_logs')
    .select('*')
    .eq('sent', false)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error || !logs || logs.length === 0) {
    console.log('No logs to process');
    return;
  }

  // Process each log
  for (const log of logs) {
    try {
      await sendToDiscord(log, webhookUrl, supabase);
      
      // Mark as sent
      await supabase
        .from('discord_logs')
        .update({ sent: true })
        .eq('id', log.id);
        
      console.log('Log sent:', log.id);
    } catch (error) {
      console.error('Failed to send log:', log.id, error);
    }
  }
}

async function sendToDiscord(payload: any, webhookUrl: string, supabase: any) {
  // Get usernames if not provided
  let username = payload.username;
  let targetUsername = payload.target_username;
  let adminUsername = payload.admin_username;

  if (payload.user_id && !username) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', payload.user_id)
      .single();
    username = data?.username || 'Unknown';
  }

  if (payload.target_user_id && !targetUsername) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', payload.target_user_id)
      .single();
    targetUsername = data?.username || 'Unknown';
  }

  if (payload.admin_id && !adminUsername) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', payload.admin_id)
      .single();
    adminUsername = data?.username || 'Unknown';
  }

    // Build Discord embed
    let color = 0x3498db; // Default blue
    let title = payload.action;
    let description = '';
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    switch (payload.action) {
      case 'flame_purchase_approved':
        color = 0xe74c3c; // Red for flames
        title = '🔥 Flame Purchase Approved';
        description = `User **${username}** purchased flames`;
        if (payload.details?.flame_amount) fields.push({ name: 'Flames', value: String(payload.details.flame_amount), inline: true });
        if (payload.details?.price_usd) fields.push({ name: 'Price', value: `$${payload.details.price_usd}`, inline: true });
        if (payload.details?.payment_method) fields.push({ name: 'Method', value: payload.details.payment_method, inline: true });
        if (payload.details?.sac_code) fields.push({ name: 'SAC Code', value: payload.details.sac_code, inline: true });
        if (adminUsername) fields.push({ name: 'Approved By', value: adminUsername, inline: true });
        break;

      case 'premium_purchased':
        color = 0xf39c12; // Gold for premium
        title = '⭐ Premium Purchased';
        description = `User **${username}** purchased premium`;
        if (payload.details?.duration) fields.push({ name: 'Duration', value: payload.details.duration, inline: true });
        if (payload.details?.cost_flames) fields.push({ name: 'Cost', value: `${payload.details.cost_flames} flames`, inline: true });
        break;

      case 'effect_purchased':
        color = 0x9b59b6; // Purple for effects
        title = '✨ Effect Purchased';
        description = `User **${username}** purchased an effect`;
        if (payload.details?.effect_name) fields.push({ name: 'Effect', value: payload.details.effect_name, inline: true });
        if (payload.details?.price) fields.push({ name: 'Price', value: `${payload.details.price} flames`, inline: true });
        break;

      case 'frame_purchased':
        color = 0x3498db; // Blue for frames
        title = '🖼️ Frame Purchased';
        description = `User **${username}** purchased a frame`;
        if (payload.details?.frame_name) fields.push({ name: 'Frame', value: payload.details.frame_name, inline: true });
        if (payload.details?.price) fields.push({ name: 'Price', value: `${payload.details.price} flames`, inline: true });
        break;

      case 'user_banned':
        color = 0xe74c3c; // Red for ban
        title = '🔨 User Banned';
        description = `User **${targetUsername}** was banned`;
        if (payload.details?.reason) fields.push({ name: 'Reason', value: payload.details.reason });
        if (adminUsername) fields.push({ name: 'Banned By', value: adminUsername, inline: true });
        break;

      case 'user_unbanned':
        color = 0x2ecc71; // Green for unban
        title = '✅ User Unbanned';
        description = `User **${targetUsername}** was unbanned`;
        if (adminUsername) fields.push({ name: 'Unbanned By', value: adminUsername, inline: true });
        break;

      case 'user_suspended':
        color = 0xe67e22; // Orange for suspend
        title = '⏸️ User Suspended';
        description = `User **${targetUsername}** was suspended`;
        if (payload.details?.reason) fields.push({ name: 'Reason', value: payload.details.reason });
        if (payload.details?.until) fields.push({ name: 'Until', value: new Date(payload.details.until).toLocaleString(), inline: true });
        if (adminUsername) fields.push({ name: 'Suspended By', value: adminUsername, inline: true });
        break;

      case 'user_unsuspended':
        color = 0x2ecc71; // Green for unsuspend
        title = '▶️ User Unsuspended';
        description = `User **${targetUsername}** was unsuspended`;
        if (adminUsername) fields.push({ name: 'Unsuspended By', value: adminUsername, inline: true });
        break;

      case 'role_added':
        color = 0x9b59b6; // Purple for roles
        title = '👑 Role Added';
        description = `Role **${payload.details?.role}** added to **${targetUsername}**`;
        if (adminUsername) fields.push({ name: 'Added By', value: adminUsername, inline: true });
        break;

      case 'role_removed':
        color = 0x95a5a6; // Gray for role removal
        title = '👤 Role Removed';
        description = `Role **${payload.details?.role}** removed from **${targetUsername}**`;
        if (adminUsername) fields.push({ name: 'Removed By', value: adminUsername, inline: true });
        break;

      case 'wallet_deposit_approved':
        color = 0x2ecc71; // Green for money
        title = '💰 Wallet Deposit Approved';
        description = `User **${username}** deposit approved`;
        if (payload.details?.amount) fields.push({ name: 'Amount', value: `$${payload.details.amount}`, inline: true });
        if (adminUsername) fields.push({ name: 'Approved By', value: adminUsername, inline: true });
        break;

      case 'wallet_money_added':
        color = 0x2ecc71; // Green
        title = '💵 Wallet Money Added';
        description = `Money added to **${targetUsername}**'s wallet`;
        if (payload.details?.amount) fields.push({ name: 'Amount', value: `$${payload.details.amount}`, inline: true });
        if (payload.details?.description) fields.push({ name: 'Reason', value: payload.details.description });
        if (adminUsername) fields.push({ name: 'Added By', value: adminUsername, inline: true });
        break;

      case 'wallet_money_removed':
        color = 0xe74c3c; // Red
        title = '💸 Wallet Money Removed';
        description = `Money removed from **${targetUsername}**'s wallet`;
        if (payload.details?.amount) fields.push({ name: 'Amount', value: `$${payload.details.amount}`, inline: true });
        if (payload.details?.description) fields.push({ name: 'Reason', value: payload.details.description });
        if (adminUsername) fields.push({ name: 'Removed By', value: adminUsername, inline: true });
        break;
    }

    // Add timestamp
    fields.push({
      name: 'Time',
      value: new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC',
      inline: false
    });

    // Send to Discord
    const discordPayload = {
      embeds: [{
        title,
        description,
        color,
        fields,
        timestamp: new Date().toISOString()
      }]
    };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discordPayload)
  });

  if (!response.ok) {
    console.error('Discord webhook failed:', await response.text());
    throw new Error(`Discord webhook failed: ${response.statusText}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Process pending logs
    await processLogs();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in discord-logger:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});