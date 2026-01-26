import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create Supabase client with auth header
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      logStep("JWT validation failed", { error: claimsError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = claimsData.claims.sub as string;
    logStep("User authenticated", { userId });

    // Create admin client for DB queries
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get subscription with stripe_subscription_id
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      logStep("Error fetching subscription", { error: subError.message });
      throw new Error("Error fetching subscription");
    }

    if (!subscription?.stripe_subscription_id) {
      logStep("No subscription found for user", { userId });
      return new Response(
        JSON.stringify({ error: "Nenhuma assinatura ativa encontrada." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      logStep("Subscription not active", { status: subscription.status });
      return new Response(
        JSON.stringify({ error: "Sua assinatura já está cancelada ou inativa." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Subscription found", { subscriptionId: subscription.stripe_subscription_id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Parse request body for immediate cancellation option
    let cancelImmediately = false;
    try {
      const body = await req.json();
      cancelImmediately = body?.immediate === true;
    } catch {
      // No body, default to cancel at period end
    }

    // Cancel the subscription
    // By default, cancel at period end so user can use until the end of billing period
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: !cancelImmediately,
      }
    );

    // If immediate cancellation requested
    if (cancelImmediately) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      logStep("Subscription cancelled immediately");
    } else {
      logStep("Subscription set to cancel at period end", {
        cancelAt: updatedSubscription.cancel_at
      });
    }

    // Update local database with period dates from Stripe
    await supabaseAdmin
      .from("subscriptions")
      .update({
        cancel_at_period_end: !cancelImmediately,
        status: cancelImmediately ? 'canceled' : subscription.status,
        current_period_start: updatedSubscription.current_period_start
          ? new Date(updatedSubscription.current_period_start * 1000).toISOString()
          : null,
        current_period_end: updatedSubscription.current_period_end
          ? new Date(updatedSubscription.current_period_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    const message = cancelImmediately
      ? "Sua assinatura foi cancelada imediatamente."
      : "Sua assinatura será cancelada ao final do período atual.";

    return new Response(JSON.stringify({
      success: true,
      message,
      cancel_at_period_end: !cancelImmediately,
      current_period_end: updatedSubscription.current_period_end
        ? new Date(updatedSubscription.current_period_end * 1000).toISOString()
        : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
