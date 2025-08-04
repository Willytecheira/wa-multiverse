import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WhatsAppSession } from '@/types/whatsapp';
import { formatDateTime, getStatusColor, getStatusIcon } from '@/utils/helpers';
import { 
  Clock, 
  Smartphone, 
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  QrCode,
  Loader2
} from 'lucide-react';

interface RecentSessionsProps {
  sessions: WhatsAppSession[];
  onSessionAction?: (sessionId: string, action: 'view' | 'disconnect') => void;
  isLoading?: boolean;
}

const RecentSessions: React.FC<RecentSessionsProps> = ({ 
  sessions, 
  onSessionAction,
  isLoading = false 
}) => {
  const recentSessions = sessions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return CheckCircle;
      case 'disconnected':
        return XCircle;
      case 'qr_ready':
        return QrCode;
      case 'initializing':
        return Loader2;
      case 'auth_failure':
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'connected':
        return 'default';
      case 'qr_ready':
        return 'secondary';
      case 'disconnected':
      case 'auth_failure':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="h-5 bg-muted animate-pulse rounded w-32 mb-2"></div>
              <div className="h-4 bg-muted animate-pulse rounded w-48"></div>
            </div>
            <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted animate-pulse rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                  <div className="h-3 bg-muted animate-pulse rounded w-24"></div>
                </div>
              </div>
              <div className="h-6 bg-muted animate-pulse rounded w-20"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-primary" />
              <span>Recent Sessions</span>
            </CardTitle>
            <CardDescription>
              Latest WhatsApp session activity
            </CardDescription>
          </div>
          <Badge variant="outline">
            {sessions.length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {recentSessions.length === 0 ? (
          <div className="text-center py-8">
            <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Sessions Yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first WhatsApp session to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => {
              const StatusIcon = getStatusIcon(session.status);
              const isAnimated = session.status === 'initializing';
              
              return (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full bg-${getStatusColor(session.status)}/10`}>
                      <StatusIcon 
                        className={`w-5 h-5 text-${getStatusColor(session.status)} ${isAnimated ? 'animate-spin' : ''}`} 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium truncate">{session.name}</h4>
                        <Badge variant={getStatusVariant(session.status)} className="text-xs">
                          {session.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>ID: {session.id.slice(-8)}</span>
                        {session.phone && (
                          <span className="flex items-center space-x-1">
                            <Smartphone className="w-3 h-3" />
                            <span>{session.phone}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created: {formatDateTime(session.createdAt)}
                        {session.connectedAt && (
                          <span className="ml-3">
                            Connected: {formatDateTime(session.connectedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {onSessionAction && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSessionAction(session.id, 'view')}
                        >
                          View
                        </Button>
                        {session.status === 'connected' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSessionAction(session.id, 'disconnect')}
                          >
                            Disconnect
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            
            {sessions.length > 5 && (
              <div className="text-center pt-4 border-t">
                <Button variant="ghost" size="sm">
                  View All Sessions ({sessions.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentSessions;