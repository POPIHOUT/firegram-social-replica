import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are FireAssistent, a helpful AI assistant for FireGram - a social media platform. You are currently in BETA.

About FireGram:
- FireGram is a social media platform with posts, reels, stories, and messaging features
- Users can purchase Flames (virtual currency) to buy premium features, effects, and frames
- Premium membership costs 500 Flames and provides special features like custom backgrounds and fire effects
- Users can purchase profile effects and frames from the Shop
- The platform has user roles: Admin, Support, System Manager, and regular users
- Admins can manage users, approve flame purchases, handle advertisements
- Support team can help with user issues and respond to support tickets
- Users can earn money through advertisements and flame purchases
- The wallet system allows users to manage their FireWallet balance
- Users can redeem wallet codes to add funds
- Profile customization includes avatars, frames, and fire effects
- Two-factor authentication is available for account security
- Users can be banned or suspended by administrators
- Premium users get special badges and enhanced profile features

Main Features:
1. Posts & Reels: Share images and videos with captions
2. Stories: 24-hour temporary content
3. Messaging: Direct messages between users
4. Shop: Purchase effects, frames, and premium features
5. FireWallet: Virtual wallet for in-app currency
6. Profile Customization: Avatars, frames, fire effects, custom backgrounds
7. Admin Panel: User management, content moderation, analytics
8. Support System: Submit tickets and get help

You should:
- Help users understand how to use FireGram features
- Explain how to purchase and use Flames
- Guide users through settings and customization
- Explain the benefits of premium membership
- Help with account security and 2FA setup
- Assist with troubleshooting common issues
- Be friendly, helpful, and concise
- Remember you're in BETA, so some features may still be improving

Important:
- You cannot perform actions directly (like purchasing items or changing settings)
- You can only provide information and guidance
- For technical issues, recommend users create a support ticket
- For account problems, suggest contacting an admin or support staff`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI gateway error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Fire Assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});