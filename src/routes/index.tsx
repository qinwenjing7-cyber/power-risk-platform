import React, { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';

const OverviewPage = React.lazy(() => import('../pages/OverviewPage'));
const FactorsPage = React.lazy(() => import('../pages/FactorsPage'));
const LongTermRiskPage = React.lazy(() => import('../pages/LongTermRiskPage'));
const ShortTermRiskPage = React.lazy(() => import('../pages/ShortTermRiskPage'));

const Loading = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: 'var(--text-dim)', fontSize: 14,
  }}>
    加载中...
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Suspense fallback={<Loading />}><OverviewPage /></Suspense> },
      { path: 'factors', element: <Suspense fallback={<Loading />}><FactorsPage /></Suspense> },
      { path: 'longterm', element: <Suspense fallback={<Loading />}><LongTermRiskPage /></Suspense> },
      { path: 'shortterm', element: <Suspense fallback={<Loading />}><ShortTermRiskPage /></Suspense> },
    ],
  },
]);
