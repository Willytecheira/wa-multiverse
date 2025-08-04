import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  // Subscribe to real-time updates for a specific table
  subscribeToTable(
    tableName: string, 
    callback: (payload: any) => void,
    filter?: { column: string; value: string }
  ): string {
    const channelName = filter 
      ? `${tableName}-${filter.column}-${filter.value}`
      : tableName;
    
    const channel = supabase
      .channel(`schema-db-changes-${channelName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` })
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  // Subscribe to session updates
  subscribeToSessions(callback: (payload: any) => void): string {
    return this.subscribeToTable('whatsapp_sessions', callback);
  }

  // Subscribe to message updates
  subscribeToMessages(callback: (payload: any) => void, sessionId?: string): string {
    if (sessionId) {
      return this.subscribeToTable('messages', callback, { column: 'session_id', value: sessionId });
    }
    return this.subscribeToTable('messages', callback);
  }

  // Subscribe to webhook updates
  subscribeToWebhooks(callback: (payload: any) => void, sessionId?: string): string {
    if (sessionId) {
      return this.subscribeToTable('webhooks', callback, { column: 'session_id', value: sessionId });
    }
    return this.subscribeToTable('webhooks', callback);
  }

  // Unsubscribe from a channel
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll(): void {
    for (const [channelName, channel] of this.channels) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
  }

  // Broadcast a custom event (for application-level notifications)
  broadcast(channelName: string, event: string, payload: any): void {
    const channel = this.channels.get(channelName) || supabase.channel(channelName);
    
    if (!this.channels.has(channelName)) {
      channel.subscribe();
      this.channels.set(channelName, channel);
    }

    channel.send({
      type: 'broadcast',
      event,
      payload
    });
  }

  // Listen to custom broadcasts
  subscribeToBroadcast(
    channelName: string, 
    event: string, 
    callback: (payload: any) => void
  ): string {
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event }, callback)
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  // User presence tracking
  trackUserPresence(channelName: string, userState: any): string {
    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        console.log('Presence sync:', channel.presenceState());
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userState);
        }
      });

    this.channels.set(channelName, channel);
    return channelName;
  }

  // Get current presence state
  getPresenceState(channelName: string): any {
    const channel = this.channels.get(channelName);
    return channel ? channel.presenceState() : {};
  }
}

export const realtimeService = new RealtimeService();