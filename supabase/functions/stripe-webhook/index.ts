import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Safe timestamp conversion (Stripe sends Unix seconds, may be undefined)
const toISOString = (timestamp: number | undefined | null): string | null => {
  if (!timestamp || isNaN(timestamp)) return null;
  const date = new Date(timestamp * 1000);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature) {
      console.error("No stripe-signature header");
      return new Response("No signature", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      if (webhookSecret) {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } else {
        // For development without webhook secret
        event = JSON.parse(body);
        console.warn("No webhook secret configured, parsing body directly");
      }
    } catch (err: unknown) {
      console.error("Webhook signature verification failed:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(`Webhook Error: ${message}`, { status: 400 });
    }

    logStep("Received webhook event", { type: event.type });

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { sessionId: session.id });

        if (session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customerEmail = session.customer_details?.email;
          const customerName = session.customer_details?.name;

          // Check if this is a guest checkout (no supabase_user_id in metadata)
          let userId = session.metadata?.supabase_user_id;

          if (!userId && customerEmail) {
            logStep("Guest checkout detected, creating user", { email: customerEmail });

            // Check if user already exists
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === customerEmail);

            if (existingUser) {
              userId = existingUser.id;
              logStep("User already exists", { userId });
            } else {
              // Create new user via invite - this sends an email automatically
              const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
                customerEmail,
                {
                  data: {
                    full_name: customerName || '',
                    stripe_customer_id: session.customer as string,
                  },
                  redirectTo: "https://tarefaa.com.br/reset-password",
                }
              );

              if (createError) {
                logStep("Error creating/inviting user", { error: createError.message });
                throw createError;
              }

              userId = newUser.user.id;
              logStep("User invited", { userId, email: customerEmail });

              // Create profile for the user
              const { error: profileError } = await supabaseAdmin
                .from("profiles")
                .insert({
                  id: userId,
                  full_name: customerName || '',
                });

              if (profileError) {
                logStep("Error creating profile (may already exist)", { error: profileError.message });
              }
            }
          }

          if (!userId) {
            logStep("ERROR: No user ID available");
            break;
          }

          // Check if subscription record exists
          const { data: existingSub } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("user_id", userId)
            .single();

          if (existingSub) {
            // Update existing subscription
            const { error } = await supabaseAdmin
              .from("subscriptions")
              .update({
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscription.id,
                status: subscription.status,
                current_period_start: toISOString(subscription.current_period_start),
                current_period_end: toISOString(subscription.current_period_end),
                cancel_at_period_end: subscription.cancel_at_period_end,
              })
              .eq("user_id", userId);

            if (error) {
              logStep("Error updating subscription", { error: error.message });
            } else {
              logStep("Subscription updated", { userId });
            }
          } else {
            // Create new subscription record
            const { error } = await supabaseAdmin
              .from("subscriptions")
              .insert({
                user_id: userId,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscription.id,
                status: subscription.status,
                current_period_start: toISOString(subscription.current_period_start),
                current_period_end: toISOString(subscription.current_period_end),
                cancel_at_period_end: subscription.cancel_at_period_end,
              });

            if (error) {
              logStep("Error creating subscription", { error: error.message });
            } else {
              logStep("Subscription created", { userId });
            }
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription event", { type: event.type, subscriptionId: subscription.id });

        // Find user by stripe_customer_id
        const { data: subData } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", subscription.customer as string)
          .single();

        if (subData) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              stripe_subscription_id: subscription.id,
              status: subscription.status,
              current_period_start: toISOString(subscription.current_period_start),
              current_period_end: toISOString(subscription.current_period_end),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq("user_id", subData.user_id);

          if (error) {
            logStep("Error updating subscription", { error: error.message });
          } else {
            logStep("Subscription updated", { userId: subData.user_id });
          }
        } else {
          logStep("No subscription found for customer", { customerId: subscription.customer });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: false,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          logStep("Error updating subscription", { error: error.message });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id });

        if (invoice.subscription) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (error) {
            logStep("Error updating subscription", { error: error.message });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
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
