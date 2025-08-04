import { useEffect } from 'react';
import { realtimeService } from '@/services/realtime';
import { useToast } from '@/hooks/use-toast';

const Notifications = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to session updates
    const sessionChannelName = realtimeService.subscribeToSessions((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (eventType === 'UPDATE' && newRecord?.status !== oldRecord?.status) {
        const status = newRecord.status;
        const sessionId = newRecord.id;
        let message = '';
        let variant: 'default' | 'destructive' = 'default';

        switch (status) {
          case 'connected':
            message = `Session ${sessionId.slice(-8)} connected successfully`;
            break;
          case 'disconnected':
            message = `Session ${sessionId.slice(-8)} disconnected`;
            variant = 'destructive';
            break;
          case 'qr_ready':
            message = `QR code ready for session ${sessionId.slice(-8)}`;
            break;
          case 'auth_failure':
            message = `Authentication failed for session ${sessionId.slice(-8)}`;
            variant = 'destructive';
            break;
          default:
            message = `Session ${sessionId.slice(-8)} status changed to ${status}`;
        }

        toast({
          title: "Session Update",
          description: message,
          variant,
        });
      }
    });

    // Subscribe to new messages
    const messageChannelName = realtimeService.subscribeToMessages((payload) => {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT' && !newRecord.is_from_me) {
        toast({
          title: "New Message",
          description: `From ${newRecord.from_number}: ${newRecord.content.slice(0, 50)}${newRecord.content.length > 50 ? '...' : ''}`,
        });
      }
    });

    return () => {
      realtimeService.unsubscribe(sessionChannelName);
      realtimeService.unsubscribe(messageChannelName);
    };
  }, [toast]);

  return null;
};

export default Notifications;