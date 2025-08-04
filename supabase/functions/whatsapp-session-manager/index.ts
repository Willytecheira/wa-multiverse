import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// WhatsApp Microservice URL - Configure this based on your deployment
const WHATSAPP_MICROSERVICE_URL = Deno.env.get('WHATSAPP_MICROSERVICE_URL') || 'http://localhost:3001'

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
        // Call WhatsApp microservice to create real session
        console.log(`Creating real WhatsApp session: ${sessionId}`)
        
        try {
          const response = await fetch(`${WHATSAPP_MICROSERVICE_URL}/session/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId })
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Failed to create session in microservice')
          }

          console.log(`Real WhatsApp session ${sessionId} creation started`)
          
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Real WhatsApp session creation started',
              microservice: result
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        } catch (error) {
          console.error(`Error creating session ${sessionId}:`, error)
          
          // Update session status to error
          await supabase
            .from('whatsapp_sessions')
            .update({
              status: 'error',
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)

          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to create session: ${error.message}`
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

      case 'delete':
        // Call microservice to delete session
        console.log(`Deleting session ${sessionId}`)
        
        try {
          const response = await fetch(`${WHATSAPP_MICROSERVICE_URL}/session/${sessionId}`, {
            method: 'DELETE',
          })

          const result = await response.json()

          if (!response.ok) {
            console.warn(`Microservice delete failed: ${result.error}`)
          }

          // Always update Supabase regardless of microservice response
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
        } catch (error) {
          console.error(`Error deleting session ${sessionId}:`, error)
          
          // Still update Supabase even if microservice fails
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
              message: 'Session marked as disconnected'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        }

      case 'get_qr':
        // Try to get QR from microservice first, then fallback to database
        try {
          const response = await fetch(`${WHATSAPP_MICROSERVICE_URL}/session/${sessionId}/qr`)
          
          if (response.ok) {
            const result = await response.json()
            return new Response(
              JSON.stringify({
                success: true,
                qr_code: result.qrCode
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            )
          }
        } catch (error) {
          console.warn(`Microservice QR fetch failed: ${error.message}`)
        }

        // Fallback to database
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
        // Try to get status from microservice first, then fallback to database
        try {
          const response = await fetch(`${WHATSAPP_MICROSERVICE_URL}/session/${sessionId}/status`)
          
          if (response.ok) {
            const result = await response.json()
            return new Response(
              JSON.stringify({
                success: true,
                status: result.status,
                phone: result.phone,
                hasQR: result.hasQR
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            )
          }
        } catch (error) {
          console.warn(`Microservice status fetch failed: ${error.message}`)
        }

        // Fallback to database
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