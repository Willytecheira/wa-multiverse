import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookTestRequest {
  webhookId: string
  testData?: any
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

    const { webhookId, testData } = await req.json() as WebhookTestRequest
    console.log(`Testing webhook: ${webhookId}`)

    // Get webhook details
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .single()

    if (webhookError || !webhook) {
      throw new Error('Webhook not found')
    }

    // Create test payload
    const testPayload = testData || {
      event: 'test',
      sessionId: webhook.session_id,
      data: {
        message: 'This is a test webhook',
        timestamp: new Date().toISOString(),
        testId: Math.random().toString(36).substring(2, 15)
      },
      timestamp: new Date().toISOString(),
      webhook: {
        id: webhook.id,
        name: webhook.name
      }
    }

    console.log(`Sending test payload to ${webhook.url}`)

    // Send test request
    const startTime = Date.now()
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhook.secret_key || '',
          'X-Webhook-Test': 'true',
          'User-Agent': 'WhatsApp-Supabase-Webhook-Tester/1.0'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      const responseTime = Date.now() - startTime
      const responseText = await response.text()

      console.log(`Webhook test completed in ${responseTime}ms with status ${response.status}`)

      if (response.ok) {
        // Update success count
        await supabase
          .from('webhooks')
          .update({
            success_count: webhook.success_count + 1,
            last_triggered: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', webhookId)

        return new Response(JSON.stringify({
          success: true,
          status: response.status,
          statusText: response.statusText,
          responseTime: `${responseTime}ms`,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          responseBody: responseText.substring(0, 1000), // Limit response body
          testPayload,
          message: 'Webhook test successful'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      } else {
        // Update error count
        await supabase
          .from('webhooks')
          .update({
            error_count: webhook.error_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', webhookId)

        return new Response(JSON.stringify({
          success: false,
          status: response.status,
          statusText: response.statusText,
          responseTime: `${responseTime}ms`,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          responseBody: responseText.substring(0, 1000),
          testPayload,
          error: `Webhook returned status ${response.status}: ${response.statusText}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Return 200 even for webhook failures so client can see the details
        })
      }
    } catch (fetchError) {
      console.error('Webhook test failed:', fetchError)
      
      // Update error count
      await supabase
        .from('webhooks')
        .update({
          error_count: webhook.error_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', webhookId)

      const responseTime = Date.now() - startTime

      return new Response(JSON.stringify({
        success: false,
        status: 0,
        statusText: 'Network Error',
        responseTime: `${responseTime}ms`,
        responseHeaders: {},
        responseBody: '',
        testPayload,
        error: fetchError.message || 'Failed to connect to webhook URL'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

  } catch (error) {
    console.error('Error in webhook tester:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})