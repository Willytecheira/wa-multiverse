import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { SystemMetrics } from '@/types/whatsapp';
import { formatFileSize } from '@/utils/helpers';
import { 
  Cpu, 
  HardDrive, 
  MemoryStick,
  Server,
  Activity,
  Zap
} from 'lucide-react';

interface SystemResourcesProps {
  metrics: SystemMetrics;
  isLoading?: boolean;
}

const SystemResources: React.FC<SystemResourcesProps> = ({ metrics, isLoading = false }) => {
  const currentMemoryUsage = metrics.memoryUsage[metrics.memoryUsage.length - 1] || 0;
  
  const resources = [
    {
      name: 'CPU Usage',
      value: Math.round(metrics.cpuUsage),
      max: 100,
      unit: '%',
      icon: Cpu,
      color: getResourceColor(Math.round(metrics.cpuUsage)),
      description: 'Processor utilization'
    },
    {
      name: 'Memory Usage',
      value: currentMemoryUsage,
      max: 100,
      unit: '%',
      icon: MemoryStick,
      color: getResourceColor(currentMemoryUsage),
      description: 'RAM consumption'
    },
    {
      name: 'Disk Usage',
      value: Math.round(metrics.diskUsage),
      max: 100,
      unit: '%',
      icon: HardDrive,
      color: getResourceColor(Math.round(metrics.diskUsage)),
      description: 'Storage utilization'
    }
  ];

  function getResourceColor(usage: number): string {
    if (usage < 60) return 'text-success';
    if (usage < 80) return 'text-warning';
    return 'text-danger';
  }

  function getResourceBgColor(usage: number): string {
    if (usage < 60) return 'bg-success';
    if (usage < 80) return 'bg-warning';
    return 'bg-danger';
  }

  function getResourceVariant(usage: number): 'default' | 'secondary' | 'destructive' {
    if (usage < 60) return 'default';
    if (usage < 80) return 'secondary';
    return 'destructive';
  }

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
        <CardContent className="space-y-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-12"></div>
              </div>
              <div className="h-2 bg-muted animate-pulse rounded w-full"></div>
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
              <Server className="w-5 h-5 text-primary" />
              <span>System Resources</span>
            </CardTitle>
            <CardDescription>
              Real-time system performance metrics
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-success/10">
            <Activity className="w-3 h-3 mr-1" />
            Online
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {resources.map((resource, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`p-1 rounded ${getResourceBgColor(resource.value)}/20`}>
                  <resource.icon className={`w-4 h-4 ${resource.color}`} />
                </div>
                <div>
                  <div className="font-medium text-sm">{resource.name}</div>
                  <div className="text-xs text-muted-foreground">{resource.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm">
                  {resource.value}{resource.unit}
                </div>
                <Badge variant={getResourceVariant(resource.value)} className="text-xs">
                  {resource.value < 60 ? 'Normal' : resource.value < 80 ? 'High' : 'Critical'}
                </Badge>
              </div>
            </div>
            <Progress 
              value={resource.value} 
              className="h-2"
            />
          </div>
        ))}

        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Network Status</span>
            <Badge variant="outline" className="bg-success/10">
              <Zap className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-2 bg-muted/30 rounded">
              <div className="font-medium">{metrics.activeSessions}</div>
              <div className="text-xs text-muted-foreground">Active Connections</div>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded">
              <div className="font-medium">{formatFileSize(currentMemoryUsage * 10485760)}</div>
              <div className="text-xs text-muted-foreground">Memory Used</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemResources;