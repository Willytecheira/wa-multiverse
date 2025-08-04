import { useState, useEffect } from 'react';
import Navigation from '@/components/Common/Navigation';
import Notifications from '@/components/Common/Notifications';
import StatsCards from '@/components/Dashboard/StatsCards';
import MemoryChart from '@/components/Dashboard/MemoryChart';
import SessionsChart from '@/components/Dashboard/SessionsChart';
import SystemResources from '@/components/Dashboard/SystemResources';
import RecentSessions from '@/components/Dashboard/RecentSessions';
import { apiService } from '@/services/api';
import { WhatsAppSession, SystemMetrics } from '@/types/whatsapp';

const Dashboard = () => {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalSessions: 0,
    activeSessions: 0,
    totalMessages: 0,
    uptime: 0,
    memoryUsage: [],
    cpuUsage: 0,
    diskUsage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [sessionsResponse] = await Promise.all([
        apiService.getSessions(),
      ]);

      if (sessionsResponse.success && sessionsResponse.data) {
        setSessions(sessionsResponse.data);
      }

      setMetrics(apiService.getSystemMetrics());
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