
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  const respond = (data: object, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }

  try {
    // SUPABASE PROJECT SETTINGS
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");

    if (!supabaseUrl || !publishableKeysRaw || !secretKeysRaw) {
      return respond({
        error: "Supabase environment variables are missing",
      }, 500);
    }

    // READ NEW SUPABASE API KEYS
    const publishableKeys = JSON.parse(publishableKeysRaw);
    const secretKeys = JSON.parse(secretKeysRaw);

    const publishableKey = publishableKeys.default;
    const secretKey = secretKeys.default;

    if (!publishableKey || !secretKey) {
      return respond({
        error: "Default Supabase API keys were not found",
      }, 500);
    }

    // CHECK LOGGED-IN USER
    const authorization = req.headers.get("Authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return respond({ error: "Unauthorized: Login required" }, 401);
    }

    const token = authorization.substring(7);

    // AUTH CLIENT
    const authClient = createClient(
      supabaseUrl,
      publishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // ADMIN CLIENT
    const adminClient = createClient(
      supabaseUrl,
      secretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // VERIFY USER SESSION
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return respond({ error: "Invalid or expired login session" }, 401);
    }

    const adminId = user.id;

    // CHECK ADMIN ROLE
    const {
      data: adminProfile,
      error: profileError,
    } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", adminId)
      .single();

    if (profileError || !adminProfile || adminProfile.role !== "admin") {
      return respond({
        error: "Access denied. Only administrators can delete users.",
      }, 403);
    }

    // READ TARGET USER ID
    const body = await req.json();
    const userId = body.user_id;

    if (!userId || typeof userId !== "string") {
      return respond({ error: "Target user ID is required" }, 400);
    }

    // PREVENT ADMIN FROM DELETING THEMSELVES
    if (userId === adminId) {
      return respond({
        error: "You cannot delete your own account",
      }, 400);
    }

    // DELETE USER FROM SUPABASE AUTH
    const {
      error: deleteError,
    } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      return respond({
        error: deleteError.message,
      }, 400);
    }

    return respond({
      success: true,
      message: "User deleted successfully",
      user_id: userId,
    });

  } catch (error) {
    console.error("Delete user error:", error);

    return respond({
      error: error instanceof Error
        ? error.message
        : "An unexpected server error occurred",
    }, 500);
  }
});
