import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { action, sessionId } = body
    
    console.log(`WhatsApp Session Manager - Action: ${action}, SessionId: ${sessionId}`)

    switch (action) {
      case 'create':
        // Simulate successful session initialization
        console.log(`Starting WhatsApp Web Simulator for session: ${sessionId}`)
        
        // Update session to qr_ready status immediately
        setTimeout(async () => {
          try {
            const qrContent = `whatsapp://qr/${Math.random().toString(36).substring(2, 15)}`
            await supabase
              .from('whatsapp_sessions')
              .update({
                status: 'qr_ready',
                qr_code: qrContent,
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId)
            
            console.log(`QR code generated for session ${sessionId}`)
          } catch (error) {
            console.error('Error generating QR:', error)
          }
        }, 2000)

        // Simulate connection after 20 seconds
        setTimeout(async () => {
          try {
            const phoneNumber = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`
            await supabase
              .from('whatsapp_sessions')
              .update({
                status: 'connected',
                phone: phoneNumber,
                connected_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId)
            
            console.log(`Session ${sessionId} connected with phone ${phoneNumber}`)
          } catch (error) {
            console.error('Error connecting session:', error)
          }
        }, 20000)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Session initialized successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )

      case 'delete':
        // Clean up session
        console.log(`Cleaning up session ${sessionId}`)
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'disconnected',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Session deleted successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )

      case 'get_qr':
        const { data: qrSession } = await supabase
          .from('whatsapp_sessions')
          .select('qr_code, status')
          .eq('id', sessionId)
          .single()

        if (qrSession?.status === 'qr_ready' && qrSession.qr_code) {
          return new Response(
            JSON.stringify({
              success: true,
              qr_code: qrSession.qr_code
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        } else {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'QR code not ready yet'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

      case 'get_status':
        const { data: statusSession } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        return new Response(
          JSON.stringify({
            success: true,
            status: statusSession?.status || 'unknown',
            phone: statusSession?.phone,
            connected_at: statusSession?.connected_at
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid action'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
    }

  } catch (error) {
    console.error('Error in WhatsApp Session Manager:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})