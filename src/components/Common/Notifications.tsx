import { useEffect, useState } from 'react';
import { websocketService } from '@/services/websocket';
import { useToast } from '@/hooks/use-toast';
import { WEBSOCKET_EVENTS } from '@/utils/constants';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Listen for WebSocket events and show toasts
    const handleSessionStatusChange = (data: any) => {
      const { sessionId, status } = data;
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
    };

    const handleNewMessage = (data: any) => {
      const { sessionId, from, content } = data;
      toast({
        title: "New Message",
        description: `From ${from}: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
      });
    };

    const handleSystemNotification = (data: any) => {
      const { type, message } = data;
      let variant: 'default' | 'destructive' = 'default';
      
      if (type === 'error' || type === 'warning') {
        variant = 'destructive';
      }

      toast({
        title: "System Notification",
        description: message,
        variant,
      });
    };

    // Subscribe to WebSocket events
    websocketService.on(WEBSOCKET_EVENTS.SESSION_STATUS_CHANGED, handleSessionStatusChange);
    websocketService.on(WEBSOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    websocketService.on(WEBSOCKET_EVENTS.SYSTEM_NOTIFICATION, handleSystemNotification);

    // Subscribe to system events
    websocketService.subscribeToSystemEvents();

    return () => {
      // Cleanup event listeners
      websocketService.off(WEBSOCKET_EVENTS.SESSION_STATUS_CHANGED, handleSessionStatusChange);
      websocketService.off(WEBSOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      websocketService.off(WEBSOCKET_EVENTS.SYSTEM_NOTIFICATION, handleSystemNotification);
    };
  }, [toast]);

  // This component doesn't render anything visible, it just handles notifications
  return null;
};

export default Notifications;