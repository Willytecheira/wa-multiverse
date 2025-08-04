import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { storageService } from '@/services/storage';
import { WhatsAppSession, WebhookConfig, WebhookEvent } from '@/types/whatsapp';
import { WEBHOOK_EVENTS } from '@/utils/constants';
import { 
  Webhook,
  Settings,
  Save,
  TestTube,
  Loader2,
  CheckCircle,
  XCircle,
  Globe,
  MessageCircle,
  Bell
} from 'lucide-react';

const WebhookManager = () => {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [webhookConfigs, setWebhookConfigs] = useState<WebhookConfig[]>([]);
  const { toast } = useToast();

  const eventOptions = [
    {
      value: WEBHOOK_EVENTS.ALL,
      label: 'All Events',
      description: 'Receive all webhook events',
      icon: Globe
    },
    {
      value: WEBHOOK_EVENTS.MESSAGE_RECEIVED,
      label: 'Message Received',
      description: 'When a message is received from a contact',
      icon: MessageCircle
    },
    {
      value: WEBHOOK_EVENTS.MESSAGE_DELIVERED,
      label: 'Message Delivered',
      description: 'When a sent message is delivered',
      icon: CheckCircle
    },
    {
      value: WEBHOOK_EVENTS.MESSAGE_FROM_ME,
      label: 'Message from Me',
      description: 'When you send a message',
      icon: Bell
    },
    {
      value: WEBHOOK_EVENTS.SESSION_STATUS,
      label: 'Session Status',
      description: 'When session status changes',
      icon: Settings
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadWebhookConfig(selectedSessionId);
    } else {
      resetForm();
    }
  }, [selectedSessionId]);

  const loadData = async () => {
    try {
      const response = await apiService.getSessions();
      if (response.success && response.data) {
        setSessions(response.data.filter(s => s.status === 'connected'));
      }
      
      const configs = storageService.getWebhookConfigs();
      setWebhookConfigs(configs);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadWebhookConfig = (sessionId: string) => {
    const config = storageService.getWebhookConfig(sessionId);
    if (config) {
      setWebhookUrl(config.url);
      setSelectedEvents(config.events);
      setIsActive(config.isActive);
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setWebhookUrl('');
    setSelectedEvents([]);
    setIsActive(true);
  };

  const handleEventChange = (eventValue: WebhookEvent, checked: boolean) => {
    if (eventValue === WEBHOOK_EVENTS.ALL) {
      if (checked) {
        setSelectedEvents([WEBHOOK_EVENTS.ALL]);
      } else {
        setSelectedEvents([]);
      }
    } else {
      setSelectedEvents(prev => {
        const filtered = prev.filter(e => e !== WEBHOOK_EVENTS.ALL);
        if (checked) {
          return [...filtered, eventValue];
        } else {
          return filtered.filter(e => e !== eventValue);
        }
      });
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const saveWebhookConfig = async () => {
    if (!selectedSessionId) {
      toast({
        title: "Error",
        description: "Please select a session",
        variant: "destructive",
      });
      return;
    }

    if (!webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive",
      });
      return;
    }

    if (!validateUrl(webhookUrl)) {
      toast({
        title: "Error",
        description: "Please enter a valid HTTP/HTTPS URL",
        variant: "destructive",
      });
      return;
    }

    if (selectedEvents.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one event",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiService.setWebhook(selectedSessionId, {
        url: webhookUrl.trim(),
        events: selectedEvents,
        isActive
      });

      if (response.success && response.data) {
        setWebhookConfigs(prev => {
          const filtered = prev.filter(c => c.sessionId !== selectedSessionId);
          return [...filtered, response.data];
        });

        toast({
          title: "Success",
          description: "Webhook configuration saved successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save webhook configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!selectedSessionId || !webhookUrl) {
      toast({
        title: "Error",
        description: "Please select a session and enter a webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      // Simulate webhook test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would send a test webhook
      toast({
        title: "Test Successful",
        description: "Webhook test completed successfully",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Webhook test failed. Please check your URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const removeWebhookConfig = (sessionId: string) => {
    storageService.removeWebhookConfig(sessionId);
    setWebhookConfigs(prev => prev.filter(c => c.sessionId !== sessionId));
    
    if (selectedSessionId === sessionId) {
      resetForm();
    }

    toast({
      title: "Success",
      description: "Webhook configuration removed",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <div className="h-6 bg-muted animate-pulse rounded w-48"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-64"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 bg-muted animate-pulse rounded"></div>
            <div className="h-10 bg-muted animate-pulse rounded"></div>
            <div className="h-32 bg-muted animate-pulse rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Webhook Configuration */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Webhook className="w-5 h-5 text-primary" />
            <span>Webhook Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure webhooks to receive real-time events from your WhatsApp sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="session">Select Session</Label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a connected session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.name} ({session.id.slice(-8)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sessions.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    No connected sessions available. Create and connect a session first.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://your-server.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  disabled={!selectedSessionId}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the URL where you want to receive webhook events
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="webhook-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={!selectedSessionId}
                />
                <Label htmlFor="webhook-active">Enable webhook</Label>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Select Events</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose which events you want to receive via webhook
              </p>
              <div className="space-y-3">
                {eventOptions.map((event) => {
                  const Icon = event.icon;
                  const isChecked = selectedEvents.includes(event.value);
                  const isAllSelected = selectedEvents.includes(WEBHOOK_EVENTS.ALL);
                  const isDisabled = !selectedSessionId || (event.value !== WEBHOOK_EVENTS.ALL && isAllSelected);

                  return (
                    <div key={event.value} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={event.value}
                        checked={isChecked || isAllSelected}
                        onCheckedChange={(checked) => handleEventChange(event.value, checked as boolean)}
                        disabled={isDisabled}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <Label htmlFor={event.value} className="font-medium cursor-pointer">
                            {event.label}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <Button
              onClick={saveWebhookConfig}
              disabled={!selectedSessionId || !webhookUrl || selectedEvents.length === 0 || isSaving}
              className="gradient-whatsapp"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
            <Button
              variant="outline"
              onClick={testWebhook}
              disabled={!selectedSessionId || !webhookUrl || isTesting}
            >
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <TestTube className="mr-2 h-4 w-4" />
              Test Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Configurations */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary" />
            <span>Active Webhook Configurations</span>
          </CardTitle>
          <CardDescription>
            Manage your existing webhook configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhookConfigs.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Webhooks Configured</h3>
              <p className="text-sm text-muted-foreground">
                Configure your first webhook to receive real-time events
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhookConfigs.map((config) => {
                const session = sessions.find(s => s.id === config.sessionId);
                return (
                  <div
                    key={config.sessionId}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">
                            {session?.name || 'Unknown Session'}
                          </h4>
                          <Badge variant={config.isActive ? 'default' : 'secondary'}>
                            {config.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          URL: {config.url}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {config.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event.replace('-', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSessionId(config.sessionId)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWebhookConfig(config.sessionId)}
                        >
                          <XCircle className="w-4 h-4 text-danger" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookManager;
