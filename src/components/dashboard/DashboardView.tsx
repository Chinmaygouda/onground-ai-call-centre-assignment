import React from 'react';
import {
  Headphones,
  PhoneCall,
  Users,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { ClickToCallButton } from '../common/ClickToCallButton';
import styles from './DashboardView.module.css';

export const DashboardView: React.FC = () => {
  const {
    agent,
    setCurrentRoute,
    openLeadsModal,
    setSelectedCallReview,
    recentCalls,
    setIsCreateLeadModalOpen,
    setIsLeaderboardOpen
  } = useAppState();

  const handleOpenPlanner = () => {
    setCurrentRoute('plan/calls');
  };

  const handleOutcomeClick = () => {
    if (recentCalls.length > 0) {
      setSelectedCallReview(recentCalls[0]);
    }
  };

  // 7-day data exactly matching mock
  const callsHandledData = [
    { day: 'Mon', value: 18 },
    { day: 'Tue', value: 22 },
    { day: 'Wed', value: 15 },
    { day: 'Thu', value: 26 },
    { day: 'Fri', value: 20 },
    { day: 'Sat', value: 12 },
    { day: 'Today', value: 14 }
  ];

  const csatTrendData = [
    { day: 'Mon', value: 88 },
    { day: 'Tue', value: 90 },
    { day: 'Wed', value: 85 },
    { day: 'Thu', value: 92 },
    { day: 'Fri', value: 89 },
    { day: 'Sat', value: 91 },
    { day: 'Today', value: 94 }
  ];

  const maxCalls = 30;

  return (
    <div className={styles.dashboardContainer}>
      {/* Dark Navy Header Banner */}
      <section className={styles.headerBanner}>
        <div className={styles.greetingSection}>
          <span className={styles.greetingSub}>Good afternoon 👋</span>
          <h1 className={styles.agentName}>{agent.name}</h1>
          <span className={styles.companySubtitle}>{agent.company} · {agent.department}</span>
        </div>

        <div className={styles.kpiGrid}>
          {/* Card 1: OG Score */}
          <div
            className={styles.kpiCard}
            onClick={() => setIsLeaderboardOpen(true)}
            style={{ cursor: 'pointer' }}
            title="View OG Score Hub Leaderboard"
          >
            <div className={styles.kpiValue}>76</div>
            <div className={styles.kpiTitle}>OG SCORE™</div>
            <div className={styles.kpiDeltaGreen}>
              <span>▲</span>
              <span>13</span>
            </div>
          </div>

          {/* Card 2: Avg Handle Time */}
          <div
            className={styles.kpiCard}
            onClick={() => setCurrentRoute('plan/recent')}
            style={{ cursor: 'pointer' }}
            title="View Recent Calls & Handle Time"
          >
            <div className={styles.kpiValue}>4m 12s</div>
            <div className={styles.kpiTitle}>AVG HANDLE TIME</div>
            <div className={styles.kpiDeltaGreen}>
              <span>▼</span>
              <span>8%</span>
            </div>
          </div>

          {/* Card 3: CSAT Today */}
          <div
            className={styles.kpiCard}
            onClick={() => setCurrentRoute('plan/recent')}
            style={{ cursor: 'pointer' }}
            title="View CSAT & SOP Quality Reviews"
          >
            <div className={styles.kpiValue}>94%</div>
            <div className={styles.kpiTitle}>CSAT TODAY</div>
            <div className={styles.kpiDeltaGreen}>
              <span>▲</span>
              <span>2pt</span>
            </div>
          </div>

          {/* Card 4: In Queue */}
          <div
            className={styles.kpiCard}
            onClick={() => setCurrentRoute('plan/calls')}
            style={{ cursor: 'pointer' }}
            title="Open Calling Plan Queue"
          >
            <div className={styles.kpiValue}>2</div>
            <div className={styles.kpiTitle}>IN QUEUE</div>
            <div className={styles.livePill}>
              <span className={styles.liveDot}></span>
              <span>live</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dashboard Body */}
      <div className={styles.dashboardBody}>
        {/* Row 1: My Progress & Monthly Earnings */}
        <div className={styles.twoColRow}>
          {/* Progress Card */}
          <div className={styles.progressCard}>
            <div className={styles.cardLabel}>
              <span>●</span>
              <span>MY PROGRESS · TODAY</span>
            </div>
            <div className={styles.progressMetricsRow}>
              <div
                className={styles.progressItem}
                onClick={() => setIsCreateLeadModalOpen(true)}
                style={{ cursor: 'pointer' }}
                title="Create a new lead"
              >
                <div className={styles.progressNum}>3</div>
                <div className={styles.progressDelta}>▲ +1</div>
                <div className={styles.progressName}>Leads Created</div>
              </div>
              <div
                className={styles.progressItem}
                onClick={() => setCurrentRoute('plan/calls')}
                style={{ cursor: 'pointer' }}
                title="View planned calls"
              >
                <div className={styles.progressNum}>2</div>
                <div className={styles.progressDelta}>▲ +2</div>
                <div className={styles.progressName}>Leads Called</div>
              </div>
            </div>
          </div>

          {/* Earnings Card */}
          <div className={styles.earningsCard}>
            <div className={styles.earningsHeader}>
              <span className={styles.earningsTitle}>💰 My earnings this month</span>
              <span className={styles.earningsTarget}>₹800 to ₹6,000</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span className={styles.earningsAmount}>₹5,200</span>
              <span className={styles.earningsCoached}>₹1,700 from coached moves</span>
            </div>
            <div className={styles.progressBarTrack}>
              <div className={styles.progressBarFill} style={{ width: '86.6%' }}></div>
            </div>
          </div>
        </div>

        {/* Row 2: Who's Waiting & My Tasks */}
        <div className={styles.twoColRow}>
          {/* Who's Waiting */}
          <div className={styles.waitingCard}>
            <div className={styles.sectionHeaderRow}>
              <span className={styles.sectionTitle}>WHO&apos;S WAITING</span>
              <button className={styles.openPlannerLink} onClick={handleOpenPlanner}>
                Open planner →
              </button>
            </div>

            <div className={styles.waitingList}>
              <div className={styles.waitingItem}>
                <div className={styles.waitingLeft}>
                  <div className={styles.headsetIcon}>
                    <Headphones size={16} />
                  </div>
                  <div>
                    <div className={styles.waitingNameRow}>
                      <span className={styles.waitingName}>Priya Iyer</span>
                      <span className={styles.waitingPhone}>+91 98765 43210</span>
                      <ClickToCallButton phone="+91 98765 43210" customerName="Priya Iyer" size="sm" />
                    </div>
                    <div className={styles.waitingReason}>Likely billing dispute — flagged before</div>
                  </div>
                </div>
                <div className={styles.waitBadgeRed}>4m 20s</div>
              </div>

              <div className={styles.waitingItem}>
                <div className={styles.waitingLeft}>
                  <div className={styles.headsetIcon}>
                    <Headphones size={16} />
                  </div>
                  <div>
                    <div className={styles.waitingNameRow}>
                      <span className={styles.waitingName}>Suresh Nair</span>
                      <span className={styles.waitingPhone}>+91 98450 11223</span>
                      <ClickToCallButton phone="+91 98450 11223" customerName="Suresh Nair" size="sm" />
                    </div>
                    <div className={styles.waitingReason}>Plan upgrade enquiry</div>
                  </div>
                </div>
                <div className={styles.waitBadgeAmber}>1m 50s</div>
              </div>
            </div>
          </div>

          {/* My Tasks Card */}
          <div className={styles.tasksCard}>
            <div className={styles.tasksHeader}>
              <span className={styles.tasksTitle}>📋 My Tasks</span>
              <span className={styles.tasksCountPill}>3</span>
            </div>

            <button className={styles.taskItemBtn} onClick={() => openLeadsModal(0)}>
              <PhoneCall size={16} color="#c2410c" />
              <span>2 callbacks <span className={styles.taskTimeSub}>next 4:30pm</span></span>
              <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
            </button>

            <button className={styles.taskItemBtn} onClick={() => openLeadsModal(1)}>
              <Users size={16} color="#c2410c" />
              <span>2 hot leads <span className={styles.taskTimeSub}>untouched 24h</span></span>
              <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
            </button>

            <button className={styles.taskItemBtn} onClick={handleOutcomeClick}>
              <FileCheck size={16} color="#c2410c" />
              <span>1 outcome <span className={styles.taskTimeSub}>to log</span></span>
              <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
            </button>
          </div>
        </div>

        {/* Row 3: 7-Day Charts */}
        <div className={styles.chartsSection}>
          {/* Calls Handled Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>CALLS HANDLED · LAST 7 DAYS</div>
            <div className={styles.barChartContainer}>
              {callsHandledData.map((item, index) => {
                const heightPct = (item.value / maxCalls) * 100;
                const isToday = item.day === 'Today';
                return (
                  <div key={index} className={styles.barColumn}>
                    <span className={styles.barValue}>{item.value}</span>
                    <div
                      className={styles.barRect}
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: isToday ? '#15803d' : '#4ade80'
                      }}
                      title={`${item.day}: ${item.value} calls handled`}
                    />
                    <span className={styles.barLabel}>{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CSAT Trend Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>CSAT TREND · LAST 7 DAYS</div>
            <div className={styles.barChartContainer}>
              {csatTrendData.map((item, index) => {
                const heightPct = (item.value / 100) * 100;
                const isToday = item.day === 'Today';
                return (
                  <div key={index} className={styles.barColumn}>
                    <span className={styles.barValue}>{item.value}%</span>
                    <div
                      className={styles.barRect}
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: isToday ? '#1d4ed8' : '#93c5fd'
                      }}
                      title={`${item.day}: ${item.value}% CSAT`}
                    />
                    <span className={styles.barLabel}>{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
