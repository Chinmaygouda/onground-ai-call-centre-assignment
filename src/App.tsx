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
import { GeminiLiveProvider } from './context/GeminiLiveContext';
import { CustomerVoiceAssistantModal } from './components/geminiLive/CustomerVoiceAssistantModal';
import { CustomerCallbackModal } from './components/callback/CustomerCallbackModal';
import { CreateLeadModal } from './components/common/CreateLeadModal';
import { CreateEventModal } from './components/common/CreateEventModal';
import { DailyBriefModal } from './components/pulse/DailyBriefModal';

import styles from './App.module.css';

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
    <div className={styles.appRoot}>
      {/* Sidebar: in-flow on desktop, adaptive off-canvas drawer on mobile */}
      <Sidebar />

      {/* Main Content Region with min-width: 0 protection */}
      <div className={styles.mainContentRegion}>
        <Topbar />

        {/* Dynamic Route Content */}
        <main className={styles.routeMain}>
          <div className={styles.routeInner}>
            {renderActiveRoute()}
          </div>
        </main>

        {/* Floating Action Pill */}
        <FloatingActionPill />
      </div>

      {/* Global Overlays */}
      <LeadsModal />
      <CallingModal />
      <CustomerVoiceAssistantModal />
      <CustomerCallbackModal />
      <CreateLeadModal />
      <CreateEventModal />
      <DailyBriefModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppStateProvider>
      <CallingProvider>
        <GeminiLiveProvider>
          <AppContent />
        </GeminiLiveProvider>
      </CallingProvider>
    </AppStateProvider>
  );
};

export default App;
