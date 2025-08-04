import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { CHART_COLORS } from '@/utils/constants';
import { Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MemoryChartProps {
  memoryData: number[];
  isLoading?: boolean;
}

const MemoryChart: React.FC<MemoryChartProps> = ({ memoryData, isLoading = false }) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date();
    hour.setHours(hour.getHours() - (23 - i));
    return hour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  });

  const currentUsage = memoryData[memoryData.length - 1] || 0;
  const averageUsage = memoryData.length > 0 
    ? Math.round(memoryData.reduce((sum, val) => sum + val, 0) / memoryData.length)
    : 0;

  const getUsageColor = (usage: number) => {
    if (usage < 60) return 'bg-success';
    if (usage < 80) return 'bg-warning';
    return 'bg-danger';
  };

  const getUsageText = (usage: number) => {
    if (usage < 60) return 'Normal';
    if (usage < 80) return 'High';
    return 'Critical';
  };

  const chartData = {
    labels: hours,
    datasets: [
      {
        label: 'Memory Usage (%)',
        data: memoryData,
        borderColor: CHART_COLORS.PRIMARY,
        backgroundColor: `${CHART_COLORS.PRIMARY}20`,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
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
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: CHART_COLORS.PRIMARY,
        borderWidth: 1,
        callbacks: {
          label: (context: any) => `Memory: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 6,
          color: '#666'
        }
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: '#f0f0f0'
        },
        ticks: {
          callback: (value: any) => `${value}%`,
          color: '#666'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
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
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded"></div>
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
              <Activity className="w-5 h-5 text-primary" />
              <span>Memory Usage (24h)</span>
            </CardTitle>
            <CardDescription>
              System memory consumption over the last 24 hours
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{currentUsage}%</div>
            <Badge variant="outline" className={getUsageColor(currentUsage)}>
              {getUsageText(currentUsage)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        </div>
        <div className="flex justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
          <span>Average: {averageUsage}%</span>
          <span>Peak: {Math.max(...memoryData)}%</span>
          <span>Low: {Math.min(...memoryData)}%</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemoryChart;