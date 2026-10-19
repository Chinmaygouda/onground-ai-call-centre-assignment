import React from 'react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { CallingProvider } from './context/CallingContext';
import { Sidebar } from './components/shell/Sidebar';
import { Topbar } from './components/shell/Topbar';
import { FloatingActionPill } from './components/shell/FloatingActionPill';
import { DashboardView } from './components/dashboard/DashboardView';
import { PlannerView } from './components/planner/PlannerView';
import { CalendarView } from './components/calendar/CalendarView';
import { PulseView } from './components/pulse/PulseView';
import { LeadsModal } from './components/leads/LeadsModal';
import { CallingModal } from './components/calling/CallingModal';

const AppContent: React.FC = () => {
  const { currentRoute } = useAppState();

  const renderActiveRoute = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardView />;
      case 'plan/calls':
        return <PlannerView defaultSubTab="calls" />;
      case 'plan/incoming':
        return <PlannerView defaultSubTab="incoming" />;
      case 'plan/recent':
        return <PlannerView defaultSubTab="recent" />;
      case 'plan/practise':
        return <PlannerView defaultSubTab="calls" />;
      case 'calendar':
        return <CalendarView />;
      case 'pulse':
      case 'pulse/channel':
        return <PulseView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 224px Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Region */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
        {/* 54px Fixed Topbar */}
        <Topbar />

        {/* Dynamic Route Content */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {renderActiveRoute()}
        </main>

        {/* Floating Action Pill */}
        <FloatingActionPill />
      </div>

      {/* Global Overlays */}
      <LeadsModal />
      <CallingModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppStateProvider>
      <CallingProvider>
        <AppContent />
      </CallingProvider>
    </AppStateProvider>
  );
};

export default App;
