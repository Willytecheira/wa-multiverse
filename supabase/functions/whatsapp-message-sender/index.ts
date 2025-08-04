import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageRequest {
  sessionId: string;
  to: string;
  content: string;
  type?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sessionId, to, content, type = 'text' }: MessageRequest = await req.json();

    console.log(`Sending message via session ${sessionId} to ${to}`);

    // Get session information
    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'connected')
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found or not connected');
    }

    // Get user info from JWT
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No authorization token provided');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Format phone number
    const formatPhoneNumber = (phone: string) => {
      // Remove all non-digits
      let cleaned = phone.replace(/\D/g, '');
      
      // Add country code if missing
      if (!cleaned.startsWith('52')) {
        cleaned = '52' + cleaned;
      }
      
      return cleaned + '@c.us';
    };

    const formattedTo = formatPhoneNumber(to);
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save message to database
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        message_id: messageId,
        chat_id: formattedTo,
        from_number: session.phone || 'unknown',
        to_number: to,
        content: content,
        message_type: type,
        status: 'sent',
        is_from_me: true,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    // Update session last activity
    await supabase
      .from('whatsapp_sessions')
      .update({
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Simulate message sending (in real implementation, this would use whatsapp-web.js)
    console.log(`Message sent: ${content} to ${formattedTo}`);

    // Simulate status updates
    setTimeout(async () => {
      await supabase
        .from('messages')
        .update({ status: 'delivered' })
        .eq('id', message.id);
    }, 2000);

    setTimeout(async () => {
      if (Math.random() > 0.3) { // 70% chance of being read
        await supabase
          .from('messages')
          .update({ status: 'read' })
          .eq('id', message.id);
      }
    }, 5000);

    // Trigger webhooks
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true);

    if (webhooks && webhooks.length > 0) {
      for (const webhook of webhooks) {
        if (webhook.events.includes('all') || webhook.events.includes('message-from-me')) {
          try {
            const webhookPayload = {
              event: 'message-from-me',
              session_id: sessionId,
              message: message,
              timestamp: new Date().toISOString()
            };

            const response = await fetch(webhook.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': webhook.secret_key || ''
              },
              body: JSON.stringify(webhookPayload)
            });

            if (response.ok) {
              await supabase
                .from('webhooks')
                .update({
                  success_count: webhook.success_count + 1,
                  last_triggered: new Date().toISOString()
                })
                .eq('id', webhook.id);
            } else {
              await supabase
                .from('webhooks')
                .update({
                  error_count: webhook.error_count + 1
                })
                .eq('id', webhook.id);
            }
          } catch (webhookError) {
            console.error('Webhook error:', webhookError);
            await supabase
              .from('webhooks')
              .update({
                error_count: webhook.error_count + 1
              })
              .eq('id', webhook.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      data: message,
      message: 'Message sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in whatsapp-message-sender:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});