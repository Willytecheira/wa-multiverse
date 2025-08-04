import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricsRequest {
  action: 'get_stats' | 'record_metric';
  type?: string;
  value?: number;
  metadata?: any;
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

    const { action, type, value, metadata }: MetricsRequest = await req.json();

    console.log(`System Metrics - Action: ${action}`);

    switch (action) {
      case 'get_stats':
        // Get system statistics
        const [
          totalSessionsResult,
          activeSessionsResult,
          totalMessagesResult,
          todayMessagesResult,
          totalWebhooksResult,
          activeWebhooksResult
        ] = await Promise.all([
          supabase.from('whatsapp_sessions').select('id', { count: 'exact' }),
          supabase.from('whatsapp_sessions').select('id', { count: 'exact' }).eq('status', 'connected'),
          supabase.from('messages').select('id', { count: 'exact' }),
          supabase.from('messages').select('id', { count: 'exact' }).gte('created_at', new Date().toISOString().split('T')[0]),
          supabase.from('webhooks').select('id', { count: 'exact' }),
          supabase.from('webhooks').select('id', { count: 'exact' }).eq('is_active', true)
        ]);

        // Get recent metrics for charts
        const { data: recentMetrics } = await supabase
          .from('system_metrics')
          .select('*')
          .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('recorded_at', { ascending: true });

        // Generate memory usage simulation
        const memoryUsage = Array.from({ length: 24 }, (_, i) => {
          const hour = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);
          return {
            time: hour.toISOString(),
            used: Math.floor(Math.random() * 512) + 256, // 256-768 MB
            total: 1024 // 1GB
          };
        });

        // Generate CPU usage simulation
        const cpuUsage = Math.floor(Math.random() * 60) + 20; // 20-80%

        // Generate session distribution
        const sessionDistribution = [
          { status: 'connected', count: activeSessionsResult.count || 0 },
          { status: 'qr_ready', count: Math.floor(Math.random() * 3) },
          { status: 'disconnected', count: (totalSessionsResult.count || 0) - (activeSessionsResult.count || 0) }
        ];

        const stats = {
          totalSessions: totalSessionsResult.count || 0,
          activeSessions: activeSessionsResult.count || 0,
          totalMessages: totalMessagesResult.count || 0,
          todayMessages: todayMessagesResult.count || 0,
          totalWebhooks: totalWebhooksResult.count || 0,
          activeWebhooks: activeWebhooksResult.count || 0,
          memoryUsage,
          cpuUsage,
          sessionDistribution,
          uptime: Math.floor(Math.random() * 720) + 24, // 24-744 hours
          recentMetrics: recentMetrics || []
        };

        // Record current metrics
        await supabase.from('system_metrics').insert([
          { metric_type: 'memory_usage', value: memoryUsage[memoryUsage.length - 1].used },
          { metric_type: 'cpu_usage', value: cpuUsage },
          { metric_type: 'active_sessions', value: stats.activeSessions },
          { metric_type: 'total_messages', value: stats.totalMessages }
        ]);

        return new Response(JSON.stringify({ 
          success: true,
          data: stats
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'record_metric':
        if (!type || value === undefined) {
          throw new Error('Type and value are required for recording metrics');
        }

        const { data: metric, error: metricError } = await supabase
          .from('system_metrics')
          .insert({
            metric_type: type,
            value: value,
            metadata: metadata
          })
          .select()
          .single();

        if (metricError) {
          throw metricError;
        }

        return new Response(JSON.stringify({ 
          success: true,
          data: metric,
          message: 'Metric recorded successfully'
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
    console.error('Error in system-metrics:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});