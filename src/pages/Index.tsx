import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Users, Webhook, BarChart3 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
            WhatsApp Multi-Session API
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Manage multiple WhatsApp Web sessions simultaneously with our powerful, 
            serverless API built on Supabase and Lovable.
          </p>
          <Button 
            onClick={() => navigate('/auth')} 
            size="lg" 
            className="gradient-whatsapp text-lg px-8 py-3"
          >
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Multi-Session Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create and manage multiple WhatsApp sessions from a single dashboard
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Webhook className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Webhook Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Receive real-time notifications about messages and session events
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Analytics & Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track message delivery, session status, and system performance
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">100% Serverless Architecture</h2>
          <p className="text-muted-foreground mb-8 max-w-3xl mx-auto">
            Built with modern technologies for scalability and reliability. 
            No servers to manage, automatic scaling, and global edge deployment.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="px-3 py-1 bg-primary/10 rounded-full">Supabase</span>
            <span className="px-3 py-1 bg-primary/10 rounded-full">Edge Functions</span>
            <span className="px-3 py-1 bg-primary/10 rounded-full">Real-time Updates</span>
            <span className="px-3 py-1 bg-primary/10 rounded-full">PostgreSQL</span>
            <span className="px-3 py-1 bg-primary/10 rounded-full">React</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;