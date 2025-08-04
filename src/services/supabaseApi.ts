import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppSession {
  id: string;
  user_id: string;
  name: string;
  session_key: string;
  status: 'initializing' | 'qr_ready' | 'connected' | 'disconnected' | 'auth_failure';
  qr_code?: string;
  phone?: string;
  client_info?: any;
  webhook_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  connected_at?: string;
  last_activity?: string;
}

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  message_id?: string;
  chat_id: string;
  from_number: string;
  to_number: string;
  content: string;
  message_type: string;
  media_url?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  is_from_me: boolean;
  timestamp: string;
  created_at: string;
  metadata?: any;
}

export interface Webhook {
  id: string;
  session_id: string;
  user_id: string;
  name: string;
  url: string;
  events: ('all' | 'message-received' | 'message-delivered' | 'message-from-me' | 'session-status')[];
  is_active: boolean;
  secret_key?: string;
  last_triggered?: string;
  success_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  category?: string;
  variables?: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// Sessions API
export const sessionsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const sessionKey = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .insert({
        user_id: user.id,
        name,
        session_key: sessionKey,
        status: 'initializing'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Call Edge Function to initialize WhatsApp session
    const { error: functionError } = await supabase.functions.invoke('whatsapp-session-manager', {
      body: { action: 'create', sessionId: data.id }
    });
    
    if (functionError) throw functionError;
    return data;
  },

  async update(id: string, updates: Partial<WhatsAppSession>) {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    // Call Edge Function to cleanup WhatsApp session
    await supabase.functions.invoke('whatsapp-session-manager', {
      body: { action: 'delete', sessionId: id }
    });

    const { error } = await supabase
      .from('whatsapp_sessions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async refreshStatus(id: string) {
    const { data, error } = await supabase.functions.invoke('whatsapp-session-manager', {
      body: { action: 'status', sessionId: id }
    });
    
    if (error) throw error;
    return data;
  }
};

// Messages API
export const messagesApi = {
  async getAll(sessionId?: string, limit = 50) {
    let query = supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async send(sessionId: string, to: string, content: string, type = 'text') {
    const { data, error } = await supabase.functions.invoke('whatsapp-message-sender', {
      body: { sessionId, to, content, type }
    });
    
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: Message['status']) {
    const { data, error } = await supabase
      .from('messages')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Webhooks API
export const webhooksApi = {
  async getAll(sessionId?: string) {
    let query = supabase
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(webhook: Omit<Webhook, 'id' | 'user_id' | 'success_count' | 'error_count' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        ...webhook,
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Webhook>) {
    const { data, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async test(id: string) {
    const { data, error } = await supabase.functions.invoke('webhook-tester', {
      body: { webhookId: id }
    });
    
    if (error) throw error;
    return data;
  }
};

// Templates API
export const templatesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(template: Omit<MessageTemplate, 'id' | 'user_id' | 'usage_count' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        ...template,
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<MessageTemplate>) {
    const { data, error } = await supabase
      .from('message_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// System Metrics API
export const metricsApi = {
  async getSystemStats() {
    const { data, error } = await supabase.functions.invoke('system-metrics', {
      body: { action: 'get_stats' }
    });
    
    if (error) throw error;
    return data;
  },

  async recordMetric(type: string, value: number, metadata?: any) {
    const { data, error } = await supabase
      .from('system_metrics')
      .insert({
        metric_type: type,
        value,
        metadata
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};