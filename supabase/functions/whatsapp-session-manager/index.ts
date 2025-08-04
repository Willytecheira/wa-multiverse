import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

// Import WhatsApp Web.js for Deno
import { Client, LocalAuth, MessageMedia } from 'https://esm.sh/whatsapp-web.js@1.31.0'

// Real WhatsApp Web implementation using whatsapp-web.js
class RealWhatsAppWebSession {
  private sessionId: string
  private sessionKey: string
  private supabase: any
  private client: any
  private isConnected = false
  private qrCode: string | null = null
  private sessionPath: string

  constructor(sessionId: string, sessionKey: string, supabase: any) {
    this.sessionId = sessionId
    this.sessionKey = sessionKey
    this.supabase = supabase
    this.sessionPath = `/tmp/whatsapp-session-${this.sessionId}`
  }

  async initialize(): Promise<string> {
    console.log(`Initializing REAL WhatsApp Web session: ${this.sessionId}`)
    
    try {
      // Create WhatsApp client with local authentication
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.sessionId,
          dataPath: this.sessionPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      })

      // Set up event handlers
      this.setupEventHandlers()

      // Initialize client
      await this.client.initialize()
      
      console.log(`WhatsApp client initialized for session: ${this.sessionId}`)
      
      return this.qrCode || 'Generating QR code...'
    } catch (error) {
      console.error(`Error initializing WhatsApp client for session ${this.sessionId}:`, error)
      await this.updateSessionStatus('auth_failure', { 
        error: error.message,
        qr_code: null 
      })
      throw error
    }
  }

  private setupEventHandlers() {
    // QR Code generation
    this.client.on('qr', async (qr: string) => {
      console.log(`Real QR code generated for session ${this.sessionId}`)
      this.qrCode = qr
      
      await this.updateSessionStatus('qr_ready', { 
        qr_code: qr,
        last_activity: new Date().toISOString()
      })
    })

    // Client ready (authenticated)
    this.client.on('ready', async () => {
      console.log(`WhatsApp client ready for session ${this.sessionId}`)
      this.isConnected = true
      
      // Get connected phone info
      const clientInfo = this.client.info
      const phone = clientInfo.wid.user
      
      await this.updateSessionStatus('connected', {
        phone: `+${phone}`,
        connected_at: new Date().toISOString(),
        qr_code: null, // Clear QR code after successful connection
        client_info: {
          phone: phone,
          name: clientInfo.pushname,
          platform: clientInfo.platform
        }
      })

      // Start heartbeat
      this.startHeartbeat()
    })

    // Authentication failure
    this.client.on('auth_failure', async (msg: string) => {
      console.error(`Authentication failed for session ${this.sessionId}:`, msg)
      this.isConnected = false
      
      await this.updateSessionStatus('auth_failure', {
        error: msg,
        qr_code: null
      })
    })

    // Client disconnected
    this.client.on('disconnected', async (reason: string) => {
      console.log(`WhatsApp client disconnected for session ${this.sessionId}:`, reason)
      this.isConnected = false
      
      await this.updateSessionStatus('disconnected', {
        is_active: false,
        qr_code: null,
        disconnected_at: new Date().toISOString(),
        disconnect_reason: reason
      })
    })

    // Incoming messages
    this.client.on('message', async (message: any) => {
      console.log(`Message received in session ${this.sessionId}:`, message.body)
      
      // Store message in database
      try {
        await this.supabase
          .from('messages')
          .insert({
            session_id: this.sessionId,
            message_id: message.id.id,
            chat_id: message.from,
            from_number: message.from,
            to_number: message.to,
            content: message.body,
            message_type: message.type,
            is_from_me: message.fromMe,
            timestamp: new Date(message.timestamp * 1000).toISOString(),
            status: 'received',
            metadata: {
              hasMedia: message.hasMedia,
              isGroup: message.from.includes('@g.us'),
              deviceType: message.deviceType
            }
          })
      } catch (error) {
        console.error('Error storing message:', error)
      }

      // Update last activity
      await this.updateSessionStatus('connected', {
        last_activity: new Date().toISOString()
      })
    })

    // Message acknowledgment
    this.client.on('message_ack', async (message: any, ack: number) => {
      const ackStatus = this.getAckStatus(ack)
      console.log(`Message ack for session ${this.sessionId}: ${ackStatus}`)
      
      // Update message status if it exists
      try {
        await this.supabase
          .from('messages')
          .update({ status: ackStatus })
          .eq('message_id', message.id.id)
          .eq('session_id', this.sessionId)
      } catch (error) {
        console.error('Error updating message status:', error)
      }
    })
  }

  private getAckStatus(ack: number): string {
    switch (ack) {
      case 1: return 'sent'
      case 2: return 'delivered'
      case 3: return 'read'
      default: return 'failed'
    }
  }

  private startHeartbeat() {
    setInterval(async () => {
      if (this.isConnected && this.client) {
        try {
          const state = await this.client.getState()
          console.log(`Heartbeat for session ${this.sessionId}: ${state}`)
          
          await this.updateSessionStatus('connected', {
            last_activity: new Date().toISOString(),
            client_state: state
          })
        } catch (error) {
          console.error(`Heartbeat error for session ${this.sessionId}:`, error)
        }
      }
    }, 30000) // Update every 30 seconds
  }

  private async updateSessionStatus(status: string, updates: any = {}) {
    try {
      await this.supabase
        .from('whatsapp_sessions')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...updates
        })
        .eq('id', this.sessionId)
    } catch (error) {
      console.error('Error updating session status:', error)
    }
  }

  async sendMessage(to: string, content: string, type: string = 'text') {
    if (!this.isConnected || !this.client) {
      throw new Error('WhatsApp client not connected')
    }

    try {
      let message
      if (type === 'text') {
        message = await this.client.sendMessage(to, content)
      } else {
        // Handle media messages
        const media = MessageMedia.fromFilePath(content)
        message = await this.client.sendMessage(to, media)
      }

      console.log(`Message sent from session ${this.sessionId} to ${to}`)
      
      // Store sent message
      await this.supabase
        .from('messages')
        .insert({
          session_id: this.sessionId,
          message_id: message.id.id,
          chat_id: to,
          from_number: message.from,
          to_number: to,
          content: content,
          message_type: type,
          is_from_me: true,
          timestamp: new Date().toISOString(),
          status: 'sent'
        })

      return message
    } catch (error) {
      console.error(`Error sending message from session ${this.sessionId}:`, error)
      throw error
    }
  }

  async disconnect() {
    console.log(`Disconnecting WhatsApp session: ${this.sessionId}`)
    
    if (this.client) {
      try {
        await this.client.logout()
        await this.client.destroy()
      } catch (error) {
        console.error(`Error during logout for session ${this.sessionId}:`, error)
      }
    }
    
    this.isConnected = false
    
    await this.updateSessionStatus('disconnected', {
      is_active: false,
      qr_code: null,
      disconnected_at: new Date().toISOString()
    })
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      qrCode: this.qrCode,
      sessionId: this.sessionId,
      clientState: this.client ? 'initialized' : 'not_initialized'
    }
  }
}

// Global session store
const activeSessions = new Map<string, RealWhatsAppWebSession>()

interface SessionRequest {
  action: 'create' | 'delete' | 'status' | 'refresh'
  sessionId: string
  name?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { action, sessionId, name } = await req.json() as SessionRequest
    console.log(`WhatsApp Session Manager - Action: ${action}, SessionId: ${sessionId}`)

    switch (action) {
      case 'create': {
        // Get session key from database
        const { data: sessionData, error: sessionError } = await supabase
          .from('whatsapp_sessions')
          .select('session_key')
          .eq('id', sessionId)
          .single()

        if (sessionError || !sessionData) {
          throw new Error('Session not found in database')
        }

        // Create new WhatsApp session
        const whatsappSession = new RealWhatsAppWebSession(sessionId, sessionData.session_key, supabase)
        activeSessions.set(sessionId, whatsappSession)
        
        // Initialize and get QR code
        const qrCode = await whatsappSession.initialize()

        return new Response(JSON.stringify({
          success: true,
          qrCode,
          status: 'qr_ready',
          message: 'Session created successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      case 'delete': {
        // Disconnect WhatsApp session if exists
        const session = activeSessions.get(sessionId)
        if (session) {
          await session.disconnect()
          activeSessions.delete(sessionId)
        }

        // Update database
        const { error } = await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'disconnected',
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)

        if (error) {
          console.error('Error updating session status:', error)
          throw error
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Session deleted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      case 'status':
      case 'refresh': {
        // Get current session status from database
        const { data: session, error } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (error) {
          console.error('Error fetching session:', error)
          throw error
        }

        // Check if we have an active WhatsApp session
        const activeSession = activeSessions.get(sessionId)
        if (activeSession) {
          const status = activeSession.getStatus()
          return new Response(JSON.stringify({
            success: true,
            ...session,
            realTimeStatus: status
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          })
        }

        return new Response(JSON.stringify({
          success: true,
          ...session
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
    }
  } catch (error) {
    console.error('Error in WhatsApp Session Manager:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})