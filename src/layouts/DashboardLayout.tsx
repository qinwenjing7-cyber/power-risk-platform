import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

export default function DashboardLayout() {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
    setLastUpdate(new Date());
    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header lastUpdate={lastUpdate} refreshing={refreshing} onRefresh={handleRefresh} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{
          flex: 1,
          overflow: 'hidden',
          padding: '20px',
          minHeight: 0,
        }}>
          <Outlet context={{ lastUpdate, refreshing, triggerRefresh: handleRefresh }} />
        </main>
      </div>
    </div>
  );
}
