import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { sessionsApi } from '@/services/supabaseApi';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppSession } from '@/types/whatsapp';
import { formatDateTime } from '@/utils/helpers';
import { transformDbSessionToFrontend } from '@/utils/dataTransforms';
import QRCodeDisplay from '@/components/Common/QRCodeDisplay';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Plus,
  QrCode,
  Trash2,
  RefreshCw,
  Smartphone,
  Activity,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const SessionManager = () => {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
    setupRealtimeSubscription();
    
    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  const loadSessions = async () => {
    try {
      const data = await sessionsApi.getAll();
      const transformedSessions = data.map(transformDbSessionToFrontend);
      setSessions(transformedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('whatsapp_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_sessions'
        },
        (payload) => {
          console.log('Session change received:', payload);
          if (payload.eventType === 'INSERT') {
            setSessions(prev => [...prev, transformDbSessionToFrontend(payload.new as any)]);
          } else if (payload.eventType === 'UPDATE') {
            setSessions(prev => 
              prev.map(session => 
                session.id === payload.new.id 
                  ? transformDbSessionToFrontend(payload.new as any)
                  : session
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(session => session.id !== payload.old.id));
          }
        }
      )
      .subscribe();
  };

  const createSession = async () => {
    if (!newSessionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const session = await sessionsApi.create(newSessionName.trim());
      const transformedSession = transformDbSessionToFrontend(session);
      setNewSessionName('');
      toast({
        title: "Success",
        description: `Session "${transformedSession.name}" created successfully`,
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await sessionsApi.delete(sessionId);
      toast({
        title: "Success",
        description: "Session deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      });
    }
  };

  const showQRCode = async (session: WhatsAppSession) => {
    if (session.status === 'qr_ready' && session.qrCode) {
      setSelectedSession(session);
      setQrDialogOpen(true);
    } else {
      toast({
        title: "QR Code Not Ready",
        description: "Please wait for the session to generate a QR code",
        variant: "destructive",
      });
    }
  };

  const refreshSession = async (sessionId: string) => {
    try {
      await sessionsApi.refreshStatus(sessionId);
      toast({
        title: "Success",
        description: "Session status refreshed",
      });
    } catch (error) {
      console.error('Error refreshing session:', error);
      toast({
        title: "Error",
        description: "Failed to refresh session",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      case 'qr_ready':
        return <QrCode className="w-4 h-4 text-warning" />;
      case 'initializing':
        return <Loader2 className="w-4 h-4 text-info animate-spin" />;
      case 'auth_failure':
        return <AlertCircle className="w-4 h-4 text-danger" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
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
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <div className="h-6 bg-muted animate-pulse rounded w-48"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-64"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 bg-muted animate-pulse rounded"></div>
              <div className="h-10 bg-muted animate-pulse rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Session */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-primary" />
            <span>Create New Session</span>
          </CardTitle>
          <CardDescription>
            Start a new WhatsApp session instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="sessionName">Session Name</Label>
              <Input
                id="sessionName"
                placeholder="Enter session name (e.g., Customer Support)"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createSession()}
                disabled={isCreating}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={createSession}
                disabled={isCreating || !newSessionName.trim()}
                className="gradient-whatsapp"
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Session
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <span>Active Sessions</span>
              </CardTitle>
              <CardDescription>
                Manage your WhatsApp session instances
              </CardDescription>
            </div>
            <Badge variant="outline">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Sessions</h3>
              <p className="text-sm text-muted-foreground">
                Create your first WhatsApp session to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(session.status)}
                        <div>
                          <h4 className="font-medium">{session.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            ID: {session.id.slice(-12)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(session.status)}>
                        {session.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refreshSession(session.id)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>

                      {session.status === 'qr_ready' && (
                        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => showQRCode(session)}
                            >
                              <QrCode className="w-4 h-4 mr-2" />
                              QR Code
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>WhatsApp QR Code</DialogTitle>
                              <DialogDescription>
                                Scan this QR code with WhatsApp to connect
                              </DialogDescription>
                            </DialogHeader>
                            {selectedSession && (
                              <QRCodeDisplay
                                sessionId={selectedSession.id}
                                sessionName={selectedSession.name}
                                qrData={selectedSession.qrCode}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-danger" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Session</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete session "{session.name}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSession(session.id)}
                              className="bg-danger hover:bg-danger/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Created: {formatDateTime(session.createdAt)}</span>
                    </div>
                    {session.connectedAt && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>Connected: {formatDateTime(session.connectedAt)}</span>
                      </div>
                    )}
                    {session.phone && (
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-4 h-4" />
                        <span>{session.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionManager;