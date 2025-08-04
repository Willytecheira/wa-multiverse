import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Zap, Shield, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">WhatsApp Multi-Session API</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Gestiona múltiples sesiones de WhatsApp con una API poderosa y escalable
          </p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link to="/auth">Comenzar</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/auth">Iniciar Sesión</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Multi-Sesión</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Maneja múltiples cuentas de WhatsApp desde una sola plataforma
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-primary mb-2" />
              <CardTitle>API REST</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Envía mensajes y gestiona webhooks con nuestra API REST completa
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Seguro</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Autenticación robusta y políticas de seguridad avanzadas
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Dashboard en tiempo real con métricas y análisis detallados
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">¿Listo para empezar?</h2>
          <p className="text-muted-foreground mb-8">
            Crea tu cuenta y comienza a gestionar tus sesiones de WhatsApp
          </p>
          <Button asChild size="lg">
            <Link to="/auth">Acceder al Panel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
