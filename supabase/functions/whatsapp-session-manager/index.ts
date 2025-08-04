import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionRequest {
  action: 'create' | 'delete' | 'status' | 'refresh';
  sessionId: string;
  name?: string;
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

    const { action, sessionId, name }: SessionRequest = await req.json();

    console.log(`WhatsApp Session Manager - Action: ${action}, SessionId: ${sessionId}`);

    switch (action) {
      case 'create':
        // Initialize WhatsApp session
        const sessionKey = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Update session status to initializing
        const { data: session, error: updateError } = await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'initializing',
            session_key: sessionKey
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating session:', updateError);
          throw updateError;
        }

        // In a real implementation, this would initialize the WhatsApp client
        // For now, we'll simulate the process
        setTimeout(async () => {
          // Simulate QR code generation
          const qrCode = `data:image/svg+xml;base64,${btoa(`<svg>QR Code for session ${sessionId}</svg>`)}`;
          
          await supabase
            .from('whatsapp_sessions')
            .update({
              status: 'qr_ready',
              qr_code: qrCode
            })
            .eq('id', sessionId);
        }, 2000);

        return new Response(JSON.stringify({ 
          success: true, 
          data: session,
          message: 'Session creation initiated'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'delete':
        // Cleanup WhatsApp session
        const { error: deleteError } = await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'disconnected',
            is_active: false
          })
          .eq('id', sessionId);

        if (deleteError) {
          console.error('Error deleting session:', deleteError);
          throw deleteError;
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Session deleted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'status':
      case 'refresh':
        // Get current session status
        const { data: currentSession, error: statusError } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (statusError) {
          console.error('Error getting session status:', statusError);
          throw statusError;
        }

        // Simulate status refresh
        let newStatus = currentSession.status;
        if (currentSession.status === 'qr_ready') {
          // Simulate connection after QR scan
          const shouldConnect = Math.random() > 0.7; // 30% chance of connection
          if (shouldConnect) {
            newStatus = 'connected';
            await supabase
              .from('whatsapp_sessions')
              .update({
                status: 'connected',
                connected_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                phone: `+1234567890${Math.floor(Math.random() * 1000)}`
              })
              .eq('id', sessionId);
          }
        }

        return new Response(JSON.stringify({ 
          success: true,
          data: { ...currentSession, status: newStatus },
          message: 'Status refreshed'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in whatsapp-session-manager:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});