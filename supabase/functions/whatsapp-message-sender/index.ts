import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MessageRequest {
  sessionId: string
  to: string
  content: string
  type?: string
}

// WhatsApp message handler
class WhatsAppMessageHandler {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  async sendMessage(sessionId: string, to: string, content: string, type: string, userId: string) {
    console.log(`Sending ${type} message to ${to} via session ${sessionId}`)
    
    // Format phone number for WhatsApp
    const formattedTo = this.formatPhoneNumber(to)
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Save message to database
    const messageData = {
      session_id: sessionId,
      user_id: userId,
      message_id: messageId,
      chat_id: formattedTo,
      from_number: 'session_bot',
      to_number: formattedTo,
      content,
      message_type: type,
      status: 'sent',
      is_from_me: true,
      timestamp: new Date().toISOString(),
      metadata: {
        sentVia: 'edge_function',
        timestamp: Date.now()
      }
    }

    const { data: message, error: messageError } = await this.supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (messageError) {
      console.error('Error saving message:', messageError)
      throw messageError
    }

    // Update session last activity
    await this.supabase
      .from('whatsapp_sessions')
      .update({
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    // Simulate message delivery (in real implementation, this would interact with WhatsApp)
    this.simulateMessageDelivery(message.id)

    // Trigger webhooks
    await this.triggerWebhooks(sessionId, 'message-from-me', {
      messageId: message.id,
      chatId: formattedTo,
      content,
      type,
      timestamp: message.timestamp
    })

    return {
      success: true,
      messageId: message.id,
      status: 'sent',
      timestamp: message.timestamp
    }
  }

  private async simulateMessageDelivery(messageId: string) {
    // Simulate delivery status updates
    setTimeout(async () => {
      try {
        await this.supabase
          .from('messages')
          .update({ status: 'delivered' })
          .eq('id', messageId)
        
        console.log(`Message ${messageId} delivered`)
      } catch (error) {
        console.error('Error updating message status to delivered:', error)
      }
    }, 2000 + Math.random() * 3000) // 2-5 seconds

    // Simulate read status
    setTimeout(async () => {
      try {
        await this.supabase
          .from('messages')
          .update({ status: 'read' })
          .eq('id', messageId)
        
        console.log(`Message ${messageId} read`)
      } catch (error) {
        console.error('Error updating message status to read:', error)
      }
    }, 5000 + Math.random() * 10000) // 5-15 seconds
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Add country code if missing
    if (cleaned.length === 10) {
      return `1${cleaned}` // Assume US/Canada
    }
    
    return cleaned
  }

  private async triggerWebhooks(sessionId: string, event: string, data: any) {
    try {
      // Get active webhooks for this session
      const { data: webhooks } = await this.supabase
        .from('webhooks')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)

      if (!webhooks || webhooks.length === 0) {
        return
      }

      // Trigger each webhook
      for (const webhook of webhooks) {
        if (webhook.events.includes('all') || webhook.events.includes(event)) {
          try {
            const payload = {
              event,
              sessionId,
              data,
              timestamp: new Date().toISOString(),
              webhook: {
                id: webhook.id,
                name: webhook.name
              }
            }

            const response = await fetch(webhook.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': webhook.secret_key || '',
                'User-Agent': 'WhatsApp-Supabase-Webhook/1.0'
              },
              body: JSON.stringify(payload)
            })

            if (response.ok) {
              // Update success count
              await this.supabase
                .from('webhooks')
                .update({
                  success_count: webhook.success_count + 1,
                  last_triggered: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', webhook.id)
              
              console.log(`Webhook ${webhook.name} triggered successfully`)
            } else {
              throw new Error(`HTTP ${response.status}`)
            }
          } catch (error) {
            console.error(`Webhook ${webhook.name} failed:`, error)
            
            // Update error count
            await this.supabase
              .from('webhooks')
              .update({
                error_count: webhook.error_count + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', webhook.id)
          }
        }
      }
    } catch (error) {
      console.error('Error triggering webhooks:', error)
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { sessionId, to, content, type = 'text' } = await req.json() as MessageRequest

    console.log(`Sending message via session ${sessionId} to ${to}`)

    // Get session information
    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'connected')
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found or not connected')
    }

    // Get user info from JWT
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      throw new Error('No authorization token provided')
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    // Create message handler and send message
    const messageHandler = new WhatsAppMessageHandler(supabase)
    const result = await messageHandler.sendMessage(sessionId, to, content, type, user.id)

    return new Response(JSON.stringify({ 
      success: true,
      data: result,
      message: 'Message sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in whatsapp-message-sender:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})