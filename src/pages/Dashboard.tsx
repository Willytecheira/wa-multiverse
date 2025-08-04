import { useState, useEffect } from 'react';
import Navigation from '@/components/Common/Navigation';
import Notifications from '@/components/Common/Notifications';
import StatsCards from '@/components/Dashboard/StatsCards';
import MemoryChart from '@/components/Dashboard/MemoryChart';
import SessionsChart from '@/components/Dashboard/SessionsChart';
import SystemResources from '@/components/Dashboard/SystemResources';
import RecentSessions from '@/components/Dashboard/RecentSessions';
import { sessionsApi, metricsApi } from '@/services/supabaseApi';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SystemMetrics {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  todayMessages?: number;
  totalWebhooks?: number;
  activeWebhooks?: number;
  memoryUsage: number[];
  cpuUsage: number;
  diskUsage: number;
  sessionDistribution?: Array<{ status: string; count: number }>;
  uptime: number;
  recentMetrics?: any[];
}

const Dashboard = () => {
  const { userRole } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalSessions: 0,
    activeSessions: 0,
    totalMessages: 0,
    uptime: 0,
    memoryUsage: [],
    cpuUsage: 0,
    diskUsage: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    
    // Set up real-time subscriptions for live data
    const setupRealtimeSubscriptions = () => {
      // Subscribe to session changes
      const sessionsChannel = supabase
        .channel('sessions-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'whatsapp_sessions' },
          () => loadData()
        )
        .subscribe();

      // Subscribe to message changes
      const messagesChannel = supabase
        .channel('messages-changes')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => loadData()
        )
        .subscribe();

      return [sessionsChannel, messagesChannel];
    };

    const channels = setupRealtimeSubscriptions();
    
    return () => {
      clearInterval(interval);
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, metricsData] = await Promise.all([
        sessionsApi.getAll().catch(() => []),
        metricsApi.getSystemStats().catch(() => null)
      ]);

      setSessions(sessionsData || []);
      
      if (metricsData?.data) {
        const data = metricsData.data;
        setMetrics({
          totalSessions: data.totalSessions || 0,
          activeSessions: data.activeSessions || 0,
          totalMessages: data.totalMessages || 0,
          todayMessages: data.todayMessages || 0,
          totalWebhooks: data.totalWebhooks || 0,
          activeWebhooks: data.activeWebhooks || 0,
          uptime: data.uptime || 0,
          memoryUsage: data.memoryUsage?.map((m: any) => m.used) || [],
          cpuUsage: data.cpuUsage || 0,
          diskUsage: data.diskUsage || 0,
          sessionDistribution: data.sessionDistribution || [],
          recentMetrics: data.recentMetrics || []
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Notifications />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your WhatsApp Multi-Session API performance
          </p>
        </div>

        <div className="space-y-8">
          <StatsCards metrics={metrics} isLoading={isLoading} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <MemoryChart memoryData={metrics.memoryUsage} isLoading={isLoading} />
            <SessionsChart sessions={sessions} isLoading={isLoading} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SystemResources metrics={metrics} isLoading={isLoading} />
            <RecentSessions sessions={sessions} isLoading={isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;