import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { WhatsAppSession, Message } from '@/types/whatsapp';
import { validatePhoneNumber, formatPhoneNumber, formatDateTime } from '@/utils/helpers';
import { 
  Send,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  User,
  History
} from 'lucide-react';

const MessageSender = () => {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const { toast } = useToast();

  const messageTemplates = [
    {
      name: 'Welcome Message',
      content: 'Welcome! Thank you for contacting us. How can we help you today?'
    },
    {
      name: 'Order Confirmation',
      content: 'Your order has been confirmed! You will receive a tracking number shortly.'
    },
    {
      name: 'Support Response',
      content: 'Thank you for reaching out. Our support team will get back to you within 24 hours.'
    },
    {
      name: 'Appointment Reminder',
      content: 'This is a reminder about your appointment scheduled for tomorrow at 2:00 PM.'
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMessageHistory();
  }, [selectedSessionId]);

  const loadData = async () => {
    try {
      const response = await apiService.getSessions();
      if (response.success && response.data) {
        const connectedSessions = response.data.filter(s => s.status === 'connected');
        setSessions(connectedSessions);
        
        if (connectedSessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(connectedSessions[0].id);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessageHistory = () => {
    if (selectedSessionId) {
      const messages = storageService.getMessagesBySession(selectedSessionId);
      setMessageHistory(messages.slice(-10)); // Show last 10 messages
    } else {
      setMessageHistory([]);
    }
  };

  const handlePhoneNumberChange = (value: string) => {
    // Remove non-numeric characters and format
    const cleaned = value.replace(/\D/g, '');
    setPhoneNumber(cleaned);
  };

  const sendMessage = async () => {
    if (!selectedSessionId) {
      toast({
        title: "Error",
        description: "Please select a session",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number (10-15 digits)",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const response = await apiService.sendMessage(selectedSessionId, formattedPhone, message.trim());
      
      if (response.success && response.data) {
        toast({
          title: "Success",
          description: `Message sent to ${formattedPhone}`,
        });
        
        setMessage('');
        loadMessageHistory(); // Refresh message history
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const useTemplate = (template: string) => {
    setMessage(template);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="w-4 h-4 text-info" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'read':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-danger" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
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
      {/* Send Message */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="w-5 h-5 text-primary" />
            <span>Send Message</span>
          </CardTitle>
          <CardDescription>
            Send test messages through your connected WhatsApp sessions
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
                        <div className="flex items-center space-x-2">
                          <span>{session.name}</span>
                          <Badge variant="outline">{session.phone}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sessions.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    No connected sessions available. Connect a session first.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Recipient Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="1234567890"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                    className="pl-9"
                    disabled={!selectedSessionId}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter phone number without country code (will auto-add +1)
                </p>
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  disabled={!selectedSessionId}
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>{message.length}/1000 characters</span>
                  <span>{Math.ceil(message.length / 160)} SMS parts</span>
                </div>
              </div>

              <Button
                onClick={sendMessage}
                disabled={!selectedSessionId || !phoneNumber || !message.trim() || isSending}
                className="w-full gradient-whatsapp"
              >
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </div>

            <div>
              <Label className="text-base font-medium">Message Templates</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Quick templates for common messages
              </p>
              <div className="space-y-2">
                {messageTemplates.map((template, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => useTemplate(template.content)}
                  >
                    <div className="font-medium text-sm mb-1">{template.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {template.content.slice(0, 80)}
                      {template.content.length > 80 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5 text-primary" />
            <span>Recent Messages</span>
          </CardTitle>
          <CardDescription>
            View recent messages sent from the selected session
          </CardDescription>
        </CardHeader>
        <CardContent>
          {messageHistory.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Messages</h3>
              <p className="text-sm text-muted-foreground">
                {selectedSessionId 
                  ? "No messages sent from this session yet"
                  : "Select a session to view message history"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messageHistory.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{msg.to}</span>
                      <Badge variant="outline" className="text-xs">
                        {msg.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 break-words">
                      {msg.content}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(msg.timestamp)}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {getStatusIcon(msg.status)}
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

export default MessageSender;