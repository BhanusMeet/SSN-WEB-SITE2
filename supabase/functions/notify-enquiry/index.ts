// ============================================================
// SSN ELITE — Instant Customer Enquiry Notifier
// Supabase Edge Function (Deno Runtime)
// 
// Dispatches instant Telegram and Email alerts on new enquiries.
// Zero secrets exposed to frontend. 100% Hostinger compatible.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface EnquiryPayload {
  id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  message?: string;
  created_at?: string;
}

serve(async (req: Request) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Support both direct invocation and Supabase Database Webhooks
    const record: EnquiryPayload = body.record || body;

    const customerName = (record.full_name || record.name || "Anonymous Customer").trim();
    const customerEmail = (record.email || "Not provided").trim();
    const customerPhone = (record.phone || "Not provided").trim();
    const customerAddress = (record.address || "Not provided").trim();
    const customerMessage = (record.message || "No message provided").trim();
    const submittedAt = record.created_at 
      ? new Date(record.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"
      : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";

    console.log(`[SSN Notifier] Processing enquiry for: ${customerName} (${customerEmail})`);

    // Environment variables (Set in Supabase Dashboard > Edge Functions > Secrets)
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "ssnindiaelite@gmail.com";
    
    let rawFromEmail = Deno.env.get("FROM_EMAIL") || "SSN Elite <onboarding@resend.dev>";
    // Resend rejects unverified public mail domains as the sender
    if (rawFromEmail.includes("@gmail.com") || rawFromEmail.includes("@yahoo.com") || rawFromEmail.includes("@outlook.com") || rawFromEmail.includes("@hotmail.com")) {
      console.warn(`[SSN Notifier] Configured FROM_EMAIL (${rawFromEmail}) is not permitted by Resend. Falling back to 'SSN Elite <onboarding@resend.dev>'`);
      rawFromEmail = "SSN Elite <onboarding@resend.dev>";
    }
    const FROM_EMAIL = rawFromEmail;

    const results = {
      telegram: { attempted: false, success: false, error: null as string | null },
      email: { attempted: false, success: false, error: null as string | null }
    };

    // ─────────────────────────────────────────────
    // 1. TELEGRAM INSTANT NOTIFICATION
    // ─────────────────────────────────────────────
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      results.telegram.attempted = true;
      try {
        const telegramText = 
`🔔 <b>NEW SSN ELITE ENQUIRY</b>

<b>Name:</b>
${escapeHtml(customerName)}

<b>Email:</b>
${escapeHtml(customerEmail)}

<b>Phone:</b>
${escapeHtml(customerPhone)}

<b>Address:</b>
${escapeHtml(customerAddress)}

<b>Message:</b>
${escapeHtml(customerMessage)}

<b>Submitted:</b>
${escapeHtml(submittedAt)}`;

        const telegramRes = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: telegramText,
              parse_mode: "HTML"
            })
          }
        );

        const tgData = await telegramRes.json();
        if (telegramRes.ok && tgData.ok) {
          results.telegram.success = true;
          console.log("[SSN Notifier] Telegram notification sent successfully.");
        } else {
          results.telegram.error = tgData.description || "Telegram API error";
          console.error("[SSN Notifier] Telegram API error:", tgData);
        }
      } catch (err: any) {
        results.telegram.error = err.message || "Failed to reach Telegram API";
        console.error("[SSN Notifier] Telegram fetch exception:", err);
      }
    } else {
      results.telegram.error = "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID secret not configured in Supabase.";
      console.warn("[SSN Notifier] Telegram secrets missing. Skipping Telegram alert.");
    }

    // ─────────────────────────────────────────────
    // 2. EMAIL NOTIFICATION (via Resend API)
    // ─────────────────────────────────────────────
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      results.email.attempted = true;
      try {
        const emailSubject = "New SSN Elite Customer Enquiry";
        const emailBodyText = 
`A new customer enquiry has been received.

Name:
${customerName}

Email:
${customerEmail}

Phone:
${customerPhone}

Address:
${customerAddress}

Message:
${customerMessage}

Submitted:
${submittedAt}`;

        const emailBodyHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0d10; color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #20242c;">
            <div style="margin-bottom: 24px; border-bottom: 1px solid #20242c; padding-bottom: 16px;">
              <span style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #0A2FFF; text-transform: uppercase;">SSN ELITE NOTIFICATION</span>
              <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 8px 0 0 0;">New Customer Enquiry</h2>
            </div>
            
            <p style="color: #8c9196; font-size: 14px; margin-bottom: 20px;">A new customer enquiry has been submitted through the Connect Now form.</p>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 10px 0; color: #8c9196; width: 100px; font-weight: 600;">Name:</td>
                <td style="padding: 10px 0; color: #ffffff; font-weight: 600;">${escapeHtml(customerName)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #8c9196; font-weight: 600;">Email:</td>
                <td style="padding: 10px 0;"><a href="mailto:${escapeHtml(customerEmail)}" style="color: #0A2FFF; text-decoration: none;">${escapeHtml(customerEmail)}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #8c9196; font-weight: 600;">Phone:</td>
                <td style="padding: 10px 0; color: #ffffff;">${escapeHtml(customerPhone)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #8c9196; font-weight: 600;">Address:</td>
                <td style="padding: 10px 0; color: #ffffff;">${escapeHtml(customerAddress)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #8c9196; font-weight: 600; vertical-align: top;">Message:</td>
                <td style="padding: 10px 0; color: #ffffff; background: #13171f; padding: 12px; border-radius: 6px;">${escapeHtml(customerMessage)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #8c9196; font-weight: 600;">Submitted:</td>
                <td style="padding: 10px 0; color: #8c9196;">${escapeHtml(submittedAt)}</td>
              </tr>
            </table>
            
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #20242c; font-size: 12px; color: #637381; text-align: center;">
              SSN Elite Performance Nutrition — Automated System Alert
            </div>
          </div>
        `;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [ADMIN_EMAIL],
            reply_to: (customerEmail && customerEmail.includes("@")) ? customerEmail : ADMIN_EMAIL,
            subject: emailSubject,
            text: emailBodyText,
            html: emailBodyHtml
          })
        });

        const emailData = await emailRes.json();
        if (emailRes.ok) {
          results.email.success = true;
          console.log("[SSN Notifier] Email notification sent successfully:", emailData);
        } else {
          results.email.error = emailData.message || "Email API error";
          console.error("[SSN Notifier] Resend API error:", emailData);
        }
      } catch (err: any) {
        results.email.error = err.message || "Failed to dispatch email";
        console.error("[SSN Notifier] Email fetch exception:", err);
      }
    } else {
      results.email.error = "RESEND_API_KEY secret not configured in Supabase.";
      console.warn("[SSN Notifier] Email secrets missing. Skipping Email alert.");
    }

    return new Response(
      JSON.stringify({
        status: "processed",
        customer: customerName,
        notifications: results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (globalErr: any) {
    console.error("[SSN Notifier] Unhandled notification error:", globalErr);
    // Always return 200 with error details so the calling frontend is never blocked
    return new Response(
      JSON.stringify({
        status: "error",
        message: globalErr.message || "Internal notifier error"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

function escapeMarkdown(text: string): string {
  return String(text || "").replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
