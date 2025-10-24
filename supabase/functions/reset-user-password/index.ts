import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin or support
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin, is_support")
      .eq("id", user.id)
      .single();

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSystemManager = roles?.some((r: any) => r.role === "system_manager");

    if (!profile?.is_admin && !profile?.is_support && !isSystemManager) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { targetUserId, username, newPassword } = await req.json();

    let userId = targetUserId;

    // If username provided, find user by username
    if (!userId && username) {
      const { data: profileData } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();
      
      if (!profileData) {
        return new Response(
          JSON.stringify({ error: "User not found with that username" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = profileData.id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Target user ID or username is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If newPassword is provided, set it directly
    if (newPassword) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        throw updateError;
      }

      // Clear must_change_password flag
      await supabaseAdmin
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", userId);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Password updated successfully."
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Generate password reset link (legacy behavior)
    const { data: resetLinkData, error: resetLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: (await supabaseAdmin.auth.admin.getUserById(userId)).data.user?.email || '',
    });

    if (resetLinkError) {
      throw resetLinkError;
    }

    const resetLink = resetLinkData.properties?.action_link;

    if (!resetLink) {
      throw new Error("Failed to generate reset link");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        resetLink: resetLink,
        message: "Password reset link generated successfully. Share this link with the user."
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
