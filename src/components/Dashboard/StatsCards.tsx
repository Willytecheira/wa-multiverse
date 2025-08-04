import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SystemMetrics } from '@/types/whatsapp';
import { formatUptime } from '@/utils/helpers';
import { 
  MessageCircle, 
  Users, 
  Activity, 
  Clock,
  TrendingUp,
  Server
} from 'lucide-react';

interface StatsCardsProps {
  metrics: SystemMetrics;
  isLoading?: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ metrics, isLoading = false }) => {
  const statsData = [
    {
      title: 'Total Sessions',
      value: metrics.totalSessions,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'All created sessions'
    },
    {
      title: 'Active Sessions', 
      value: metrics.activeSessions,
      icon: Activity,
      color: 'text-success',
      bgColor: 'bg-green-100',
      description: 'Currently connected'
    },
    {
      title: 'Total Messages',
      value: metrics.totalMessages,
      icon: MessageCircle,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'Messages sent/received'
    },
    {
      title: 'System Uptime',
      value: formatUptime(metrics.uptime),
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Since last restart'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
              </CardTitle>
              <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card key={index} className="shadow-card hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
            {stat.title === 'Active Sessions' && metrics.totalSessions > 0 && (
              <Badge variant="outline" className="mt-2">
                {Math.round((metrics.activeSessions / metrics.totalSessions) * 100)}% online
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;