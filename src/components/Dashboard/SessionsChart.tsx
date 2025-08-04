import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { WhatsAppSession } from '@/types/whatsapp';
import { CHART_COLORS } from '@/utils/constants';
import { Users, Wifi, WifiOff, Clock, AlertCircle, QrCode } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SessionsChartProps {
  sessions: WhatsAppSession[];
  isLoading?: boolean;
}

const SessionsChart: React.FC<SessionsChartProps> = ({ sessions, isLoading = false }) => {
  const sessionCounts = sessions.reduce((acc, session) => {
    acc[session.status] = (acc[session.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusConfig = {
    connected: { 
      label: 'Connected', 
      color: CHART_COLORS.SUCCESS, 
      icon: Wifi,
      bgColor: 'bg-success'
    },
    disconnected: { 
      label: 'Disconnected', 
      color: CHART_COLORS.MUTED, 
      icon: WifiOff,
      bgColor: 'bg-muted'
    },
    qr_ready: { 
      label: 'QR Ready', 
      color: CHART_COLORS.WARNING, 
      icon: QrCode,
      bgColor: 'bg-warning'
    },
    initializing: { 
      label: 'Initializing', 
      color: CHART_COLORS.INFO, 
      icon: Clock,
      bgColor: 'bg-info'
    },
    auth_failure: { 
      label: 'Auth Failed', 
      color: CHART_COLORS.DANGER, 
      icon: AlertCircle,
      bgColor: 'bg-danger'
    }
  };

  const chartData = {
    labels: Object.keys(sessionCounts).map(status => statusConfig[status as keyof typeof statusConfig]?.label || status),
    datasets: [
      {
        data: Object.values(sessionCounts),
        backgroundColor: Object.keys(sessionCounts).map(status => 
          statusConfig[status as keyof typeof statusConfig]?.color || CHART_COLORS.MUTED
        ),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderWidth: 3,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: CHART_COLORS.PRIMARY,
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = Math.round((context.parsed / total) * 100);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%',
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
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="w-48 h-48 bg-muted animate-pulse rounded-full"></div>
          </div>
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
              <Users className="w-5 h-5 text-primary" />
              <span>Session Status</span>
            </CardTitle>
            <CardDescription>
              Distribution of WhatsApp session states
            </CardDescription>
          </div>
          <Badge variant="outline">
            {sessions.length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Sessions</h3>
            <p className="text-sm text-muted-foreground">
              Create your first WhatsApp session to see analytics
            </p>
          </div>
        ) : (
          <>
            <div className="h-48 flex items-center justify-center">
              <div className="relative w-48 h-48">
                <Doughnut data={chartData} options={chartOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold">{sessions.length}</div>
                  <div className="text-sm text-muted-foreground">Sessions</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              {Object.entries(sessionCounts).map(([status, count]) => {
                const config = statusConfig[status as keyof typeof statusConfig];
                if (!config) return null;
                
                const Icon = config.icon;
                return (
                  <div key={status} className="flex items-center space-x-2 p-2 rounded-lg bg-muted/30">
                    <div className={`p-1 rounded ${config.bgColor}/20`}>
                      <Icon className="w-3 h-3" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{config.label}</div>
                      <div className="text-xs text-muted-foreground">{count} session{count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionsChart;