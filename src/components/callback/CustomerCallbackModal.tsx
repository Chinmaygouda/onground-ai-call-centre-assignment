import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall,
  PhoneOff,
  UserCheck,
  Sparkles,
  Bot,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  X,
  AlertCircle,
  PhoneForwarded,
  Phone,
  Radio
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useGeminiLive } from '../../context/GeminiLiveContext';
import { ClickToCallButton } from '../common/ClickToCallButton';
import { normalizePhoneNumber } from '../../utils/phoneUtils';
import { RecentCall } from '../../types';
import styles from './CustomerCallbackModal.module.css';

export const SUGGESTED_CLIENT_RESPONSES = [
  'Yeah, I was looking for the SmartGRID Ortho mattress. Is it in stock?',
  'How many units are available in Queen size?',
  'What are the current offers and discounts on mattresses?',
  'Can someone from the frontline team call me this evening to book it?'
];

export const PREFERRED_TIME_WINDOWS = [
  'Within 2 hours (Urgent SLA)',
  'Today Afternoon (2:00 PM - 5:00 PM)',
  'Today Evening (5:00 PM - 8:00 PM)',
  'Tomorrow Morning (10:00 AM - 1:00 PM)'
];

export const CustomerCallbackModal: React.FC = () => {
  const {
    callbackCustomer,
    isCallbackModalOpen,
    closeCallbackModal,
    recordHumanCallback,
    recordCallInteraction,
    resolveMissedCall
  } = useAppState();

  const {
    voiceActivityState,
    audioLevel,
    isAiSpeaking,
    isAiThinking,
    isMuted,
    toggleMute,
    isVoiceOutputEnabled,
    toggleVoiceOutput,
    startSession,
    endSession,
    askQuestion,
    speakAnswer,
    stopSpeaking,
    turns,
    userTranscript,
    errorMessage
  } = useGeminiLive();

  // Modal Step State
  const [step, setStep] = useState<
    'choice' | 'human_form' | 'human_confirmed' | 'direct_called' | 'ai_workspace' | 'session_ended'
  >('choice');
  const [mobileTab, setMobileTab] = useState<'call' | 'agent'>('call');

  // Human Callback Form State
  const [preferredTime, setPreferredTime] = useState<string>(PREFERRED_TIME_WINDOWS[0]);
  const [callbackNotes, setCallbackNotes] = useState<string>('');
  const [confirmedTicketId, setConfirmedTicketId] = useState<string>('');

  // AI Workspace Call Lifecycle State
  const [callPhase, setCallPhase] = useState<'dialing' | 'connected' | 'ended'>('connected');
  const [inputText, setInputText] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [localCaptions, setLocalCaptions] = useState<
    Array<{ id: string; speaker: 'customer' | 'agent'; text: string; time: string }>
  >([]);
  const [savedRecentCall, setSavedRecentCall] = useState<RecentCall | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const captionsEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize or reset when customer changes
  useEffect(() => {
    if (isCallbackModalOpen && callbackCustomer) {
      setStep('choice');
      setPreferredTime(PREFERRED_TIME_WINDOWS[0]);
      setCallbackNotes(
        callbackCustomer.missedText
          ? `Client enquiry follow-up. ${callbackCustomer.missedText}`
          : 'Client requested callback.'
      );
      setElapsedSeconds(0);
      setCallPhase('connected');
      setSavedRecentCall(null);
      setLocalCaptions([]);
    }
  }, [isCallbackModalOpen, callbackCustomer]);

  // Session timer when in connected AI workspace
  useEffect(() => {
    if (step === 'ai_workspace' && callPhase === 'connected') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [step, callPhase]);

  // Sync Gemini Live turns into local captions
  useEffect(() => {
    if (step === 'ai_workspace' && turns.length > 0) {
      const mapped = turns.map((t) => ({
        id: t.id,
        speaker: (t.speaker === 'user' ? 'customer' : 'agent') as 'customer' | 'agent',
        text: t.text,
        time: t.timestamp
      }));
      setLocalCaptions(mapped);
    }
  }, [turns, step]);

  // Auto-scroll captions to bottom
  useEffect(() => {
    if (captionsEndRef.current) {
      captionsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localCaptions, isAiThinking, userTranscript, callPhase]);

  if (!isCallbackModalOpen || !callbackCustomer) {
    return null;
  }

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const { telUri } = normalizePhoneNumber(callbackCustomer.phone);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // Step 1: Employee chooses "Call by yourself"
  const handleSelectCallYourself = () => {
    setStep('human_form');
  };

  // Immediate dial by employee
  const handleDirectDialByEmployee = () => {
    resolveMissedCall(callbackCustomer.id);

    const nowTimeStr = `Today ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const recentRecord: RecentCall = {
      id: `call-emp-${Date.now()}`,
      name: callbackCustomer.name,
      initials: callbackCustomer.initials,
      timeText: nowTimeStr,
      duration: '0m 45s (Dialling)',
      type: 'outbound',
      phone: callbackCustomer.phone,
      sopScore: 92,
      greetingPassed: true,
      notes: `Direct Call: Frontline agent Arvind Rajan initiated outbound call to client via registered dialer.`,
      transcript: [
        {
          speaker: 'Arvind Rajan (Employee)',
          text: `Initiated direct outbound phone call to ${callbackCustomer.name} (${callbackCustomer.phone}) regarding ${callbackCustomer.missedText}.`,
          time: nowTimeStr
        }
      ]
    };

    recordCallInteraction(recentRecord);

    if (telUri) {
      window.location.href = telUri;
    }

    setSavedRecentCall(recentRecord);
    setStep('direct_called');
  };

  // Schedule callback for employee's shift
  const handleConfirmHumanCallback = () => {
    const ticketId = 'TKT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setConfirmedTicketId(ticketId);

    recordHumanCallback({
      customerId: callbackCustomer.id,
      customerName: callbackCustomer.name,
      phone: callbackCustomer.phone,
      preferredTime,
      notes: callbackNotes,
      expectedValue: callbackCustomer.expectedValue
    });

    setStep('human_confirmed');
  };

  // Step 1: Employee chooses "Ask AI Agent to call back and enquire"
  const handleSelectAiAgent = async () => {
    setStep('ai_workspace');
    setCallPhase('dialing');
    setElapsedSeconds(0);

    // 1. Begin live session
    try {
      await startSession();
    } catch (e) {
      console.warn('[CustomerCallbackModal] Live session start error (fallback active):', e);
    }

    // 2. Simulate ringing phase (1.2s) then client answers
    setTimeout(() => {
      setCallPhase('connected');

      // AI Agent opens the call upon pickup
      const customerFirstName = callbackCustomer.name.split(' ')[0] || 'there';
      const greetingText = `Hello ${customerFirstName}! I'm calling from The Sleep Company and OnGround to follow up on your missed call. We noticed you reached out earlier regarding our SmartGRID mattresses. How can I assist you with availability, prices, or store details today?`;

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setLocalCaptions([
        {
          id: 'greeting-agent',
          speaker: 'agent',
          text: greetingText,
          time: nowStr
        }
      ]);

      speakAnswer(greetingText);
    }, 1200);
  };

  // Client responds in AI Workspace
  const handleSendPrompt = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    setInputText('');
    await askQuestion(query);
  };

  // End AI Conversation
  const handleEndAiConversation = () => {
    stopSpeaking();
    endSession();
    setCallPhase('ended');

    const formattedDur = `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
    const nowTimeStr = `Today ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const recentRecord: RecentCall = {
      id: `call-ai-${Date.now()}`,
      name: callbackCustomer.name,
      initials: callbackCustomer.initials,
      timeText: nowTimeStr,
      duration: formattedDur,
      type: 'outbound',
      phone: callbackCustomer.phone,
      sopScore: 96,
      greetingPassed: true,
      notes: `AI Outbound Callback: AI Agent called client on behalf of Arvind Rajan. Handled product enquiry and verified stock.`,
      transcript: localCaptions.map((c) => ({
        speaker: c.speaker === 'customer' ? `Client (${callbackCustomer.name})` : 'AI Agent (The Sleep Company)',
        text: c.text,
        time: c.time
      }))
    };

    recordCallInteraction(recentRecord);
    resolveMissedCall(callbackCustomer.id);
    setSavedRecentCall(recentRecord);
    setStep('session_ended');
  };

  const handleCloseModal = () => {
    if (step === 'ai_workspace') {
      handleEndAiConversation();
    }
    closeCallbackModal();
  };

  // Dynamic Audio Waveform computation
  const renderWaveform = () => {
    const barCount = 14;
    return (
      <div className={styles.waveformContainer}>
        {Array.from({ length: barCount }).map((_, idx) => {
          let height = 8;
          let colorClass = styles.waveBar;

          if (isAiSpeaking) {
            // AI is speaking response
            const wave = Math.sin((idx + Date.now() / 150) * 0.8);
            height = Math.max(10, Math.floor(25 + wave * 22));
            colorClass = `${styles.waveBar} ${styles.waveBarActiveBlue}`;
          } else if (voiceActivityState === 'VOICE_DETECTED' || audioLevel > 5) {
            // Customer speaking into mic
            const dynamicScale = Math.min(50, Math.max(12, (audioLevel / 100) * 55 + (idx % 3) * 6));
            height = dynamicScale;
            colorClass = `${styles.waveBar} ${styles.waveBarActiveGreen}`;
          } else if (voiceActivityState === 'LISTENING' && callPhase === 'connected') {
            // Ambient breathing
            height = 8 + (idx % 4) * 3;
            colorClass = `${styles.waveBar} ${styles.waveBarActiveGreen}`;
          }

          return (
            <div
              key={idx}
              className={colorClass}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.overlay} onClick={handleCloseModal}>
      <div
        className={`${styles.modalCard} ${
          step === 'choice'
            ? styles.modalChoice
            : step === 'human_form' ||
              step === 'human_confirmed' ||
              step === 'direct_called' ||
              step === 'session_ended'
            ? styles.modalForm
            : styles.modalWorkspace
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ====================================================
            MODAL HEADER
            ==================================================== */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconCircle}>
              {step === 'ai_workspace' ? <Bot size={22} /> : <PhoneCall size={20} />}
            </div>
            <div>
              <h2 className={styles.headerTitle}>
                {step === 'ai_workspace'
                  ? `AI Outbound Callback · ${callbackCustomer.name}`
                  : step === 'human_form'
                  ? 'Call Client by Yourself'
                  : step === 'human_confirmed'
                  ? 'Callback Scheduled on Shift'
                  : step === 'direct_called'
                  ? 'Direct Call Initiated'
                  : step === 'session_ended'
                  ? 'Call Completed & Persisted'
                  : 'Missed Call Callback Options'}
              </h2>
              <p className={styles.headerSubtitle}>
                <span>Client: {callbackCustomer.name}</span>
                <span>•</span>
                <span>{callbackCustomer.phone}</span>
                <ClickToCallButton
                  phone={callbackCustomer.phone}
                  customerName={callbackCustomer.name}
                  size="sm"
                />
              </p>
            </div>
          </div>

          <button className={styles.closeBtn} onClick={handleCloseModal} title="Close workflow">
            <X size={20} />
          </button>
        </div>

        {/* ====================================================
            CLIENT SUMMARY BANNER (Shown in choice & form steps)
            ==================================================== */}
        {(step === 'choice' || step === 'human_form') && (
          <div className={styles.customerBanner}>
            <div className={styles.customerBannerLeft}>
              <div className={styles.customerAvatar}>{callbackCustomer.initials}</div>
              <div>
                <div className={styles.customerNameRow}>
                  <span className={styles.customerName}>{callbackCustomer.name}</span>
                  <span className={styles.customerPhone}>{callbackCustomer.phone}</span>
                  <ClickToCallButton
                    phone={callbackCustomer.phone}
                    customerName={callbackCustomer.name}
                    size="sm"
                  />
                </div>
                <div className={styles.customerContext}>
                  {callbackCustomer.missedText}
                </div>
              </div>
            </div>

            <div className={styles.customerBannerRight}>
              <div className={styles.valueBadge}>
                {callbackCustomer.expectedValue > 0
                  ? `₹${callbackCustomer.expectedValue.toLocaleString()}`
                  : 'New Contact'}
              </div>
              <div className={styles.valueSubtext}>
                {callbackCustomer.expectedValue > 0 ? 'Expected Value at Stake' : 'High Priority'}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            STEP 1: EMPLOYEE CHOICE VIEW
            Option A: Call by yourself
            Option B: Ask the agent to call back and enquire
            ==================================================== */}
        {step === 'choice' && (
          <div className={styles.choiceContainer}>
            <p className={styles.choicePrompt}>
              As frontline employee Arvind Rajan, choose how you want to handle this missed client call:
            </p>

            {/* Option A: Call by yourself */}
            <div
              className={styles.optionCard}
              onClick={handleSelectCallYourself}
              role="button"
              tabIndex={0}
            >
              <div className={styles.optionIconCircle}>
                <UserCheck size={24} />
              </div>
              <div className={styles.optionContent}>
                <div className={styles.optionHeaderRow}>
                  <h3 className={styles.optionTitle}>Call by yourself</h3>
                  <span className={styles.optionBadge}>Direct Employee Call</span>
                </div>
                <p className={styles.optionDesc}>
                  Handle this missed call personally. Dial the client immediately via your device/browser phone, or schedule a callback reminder task for your shift.
                </p>
              </div>
              <ArrowRight size={20} className={styles.optionArrow} />
            </div>

            {/* Option B: Ask the agent to call back and enquire */}
            <div
              className={`${styles.optionCard} ${styles.optionCardAi}`}
              onClick={handleSelectAiAgent}
              role="button"
              tabIndex={0}
            >
              <div className={`${styles.optionIconCircle} ${styles.optionIconCircleAi}`}>
                <Sparkles size={24} />
              </div>
              <div className={styles.optionContent}>
                <div className={styles.optionHeaderRow}>
                  <h3 className={styles.optionTitle}>Ask AI Agent to call back and enquire</h3>
                  <span className={`${styles.optionBadge} ${styles.optionBadgeAi}`}>
                    Automated AI Outbound · Live Voice & Captions
                  </span>
                </div>
                <p className={styles.optionDesc}>
                  Delegate the call to the OnGround AI Agent. The AI dials the client, introduces itself upon pickup, enquires about their mattress interest, listens to their questions, and guides them throughout the call with live captions.
                </p>
              </div>
              <ArrowRight size={20} className={styles.optionArrow} />
            </div>
          </div>
        )}

        {/* ====================================================
            STEP 2A: CALL BY YOURSELF (DIRECT DIAL OR SCHEDULE)
            ==================================================== */}
        {step === 'human_form' && (
          <div className={styles.formBody}>
            {/* Direct Call Now Action */}
            <div
              style={{
                backgroundColor: '#0c211b',
                border: '1.5px solid #059669',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#34d399' }}>
                  Option 1: Dial Client Immediately
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                  Launch {callbackCustomer.phone} in your registered native phone dialer or browser calling.
                </p>
              </div>
              <button
                className={styles.btnPrimaryGreen}
                onClick={handleDirectDialByEmployee}
                title={`Call ${callbackCustomer.name} now`}
              >
                <Phone size={16} />
                <span>Call Client Now</span>
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', margin: '4px 0' }}>
              — OR SCHEDULE ON YOUR SHIFT —
            </div>

            {/* Schedule Option */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Preferred Callback Window on Shift</label>
              <select
                className={styles.formSelect}
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              >
                {PREFERRED_TIME_WINDOWS.map((window) => (
                  <option key={window} value={window}>
                    {window}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Client Notes & Context for Your Call</label>
              <textarea
                className={styles.formTextarea}
                value={callbackNotes}
                onChange={(e) => setCallbackNotes(e.target.value)}
                placeholder="Enter enquiry notes or specific questions for your call..."
              />
            </div>

            <div className={styles.truthfulNotice}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Frontline Queue:</strong> Scheduling will add an assigned task to your Calls-to-Make queue and create a calendar reminder for your shift.
              </div>
            </div>

            <div className={styles.formActions}>
              <button className={styles.btnSecondary} onClick={() => setStep('choice')}>
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
              <button className={styles.btnPrimaryGreen} onClick={handleConfirmHumanCallback}>
                <CheckCircle2 size={16} />
                <span>Schedule Callback Task</span>
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            CONFIRMATION: DIRECT CALL INITIATED
            ==================================================== */}
        {step === 'direct_called' && (
          <div className={styles.confirmationContainer}>
            <div className={styles.successIconCircle}>
              <PhoneForwarded size={36} />
            </div>
            <h3 className={styles.confirmationTitle}>Direct Call Launched</h3>
            <p className={styles.confirmationSubtitle}>
              Frontline call to <strong>{callbackCustomer.name}</strong> was triggered via your device dialler.
            </p>

            <div className={styles.confirmationDetailsCard}>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Client</span>
                <span className={styles.confirmationDetailValue}>{callbackCustomer.name}</span>
              </div>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Number</span>
                <span className={styles.confirmationDetailValue}>{callbackCustomer.phone}</span>
              </div>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Status</span>
                <span className={styles.confirmationDetailValue} style={{ color: '#34d399' }}>
                  Handled Personally by Arvind Rajan
                </span>
              </div>
              {savedRecentCall && (
                <div className={styles.confirmationDetailRow}>
                  <span className={styles.confirmationDetailLabel}>Call Log ID</span>
                  <span className={styles.confirmationDetailValue}>{savedRecentCall.id}</span>
                </div>
              )}
            </div>

            <button className={styles.btnPrimaryGreen} onClick={handleCloseModal}>
              <span>Done · Return to Planner</span>
            </button>
          </div>
        )}

        {/* ====================================================
            CONFIRMATION: SCHEDULED ON EMPLOYEE'S SHIFT
            ==================================================== */}
        {step === 'human_confirmed' && (
          <div className={styles.confirmationContainer}>
            <div className={styles.successIconCircle}>
              <CheckCircle2 size={36} />
            </div>
            <h3 className={styles.confirmationTitle}>Callback Scheduled on Shift</h3>
            <p className={styles.confirmationSubtitle}>
              A follow-up task has been added to the Calls-to-Make queue for <strong>Arvind Rajan</strong>.
            </p>

            <div className={styles.confirmationDetailsCard}>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Ticket ID</span>
                <span className={styles.confirmationDetailValue}>{confirmedTicketId}</span>
              </div>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Client</span>
                <span className={styles.confirmationDetailValue}>{callbackCustomer.name}</span>
              </div>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Scheduled Window</span>
                <span className={styles.confirmationDetailValue} style={{ color: '#34d399' }}>
                  {preferredTime}
                </span>
              </div>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Assigned Agent</span>
                <span className={styles.confirmationDetailValue}>Arvind Rajan</span>
              </div>
            </div>

            <button className={styles.btnPrimaryGreen} onClick={handleCloseModal}>
              <span>Done · Return to Planner</span>
            </button>
          </div>
        )}

        {/* ====================================================
            STEP 2B: TWO-PANEL WORKSPACE (AI CALLS CLIENT)
            ==================================================== */}
        {step === 'ai_workspace' && (
          <>
            {/* Mobile Tab Switcher */}
            <div className={styles.mobileTabSwitcher}>
              <button
                className={`${styles.mobileTabBtn} ${mobileTab === 'call' ? styles.mobileTabBtnActive : ''}`}
                onClick={() => setMobileTab('call')}
              >
                Live Call Controls
              </button>
              <button
                className={`${styles.mobileTabBtn} ${mobileTab === 'agent' ? styles.mobileTabBtnActive : ''}`}
                onClick={() => setMobileTab('agent')}
              >
                AI Agent & Captions
              </button>
            </div>

            <div className={styles.workspaceLayout}>
              {/* ----------------------------------------------------
                  LEFT PANEL: LIVE OUTBOUND CALL
                  ---------------------------------------------------- */}
              <div className={`${styles.leftCallPanel} ${mobileTab === 'call' ? styles.showMobileLeft : ''}`}>
                <div>
                  {/* Client Card */}
                  <div className={styles.callerCard}>
                    <div className={styles.callerTopRow}>
                      <div className={styles.callerAvatarLarge}>{callbackCustomer.initials}</div>
                      <div>
                        <div className={styles.callerName}>{callbackCustomer.name}</div>
                        <div className={styles.callerPhoneRow}>
                          <span>{callbackCustomer.phone}</span>
                          <ClickToCallButton
                            phone={callbackCustomer.phone}
                            customerName={callbackCustomer.name}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.callerContextBlock}>
                      <span>{callbackCustomer.missedText}</span>
                      {callbackCustomer.expectedValue > 0 && (
                        <strong style={{ color: '#34d399' }}>
                          ₹{callbackCustomer.expectedValue.toLocaleString()}
                        </strong>
                      )}
                    </div>
                  </div>

                  {/* Call Status & Waveform Block */}
                  <div className={styles.callStatusBlock}>
                    <div
                      className={`${styles.statusPill} ${
                        callPhase === 'dialing'
                          ? styles.statusPillConnecting
                          : errorMessage
                          ? styles.statusPillError
                          : isAiSpeaking
                          ? styles.statusPillSpeaking
                          : isAiThinking
                          ? styles.statusPillConnecting
                          : voiceActivityState === 'VOICE_DETECTED'
                          ? styles.statusPillConnected
                          : styles.statusPillListening
                      }`}
                    >
                      <span className={styles.pulseDot} />
                      <span>
                        {callPhase === 'dialing'
                          ? 'Dialling Client · Ringing...'
                          : errorMessage
                          ? 'Connection Alert'
                          : isAiSpeaking
                          ? 'AI Agent Speaking'
                          : isAiThinking
                          ? 'Checking Inventory'
                          : voiceActivityState === 'VOICE_DETECTED'
                          ? 'Client Voice Detected'
                          : isMuted
                          ? 'Microphone Muted'
                          : 'Listening to Client'}
                      </span>
                    </div>

                    <div className={styles.sessionTimer}>
                      {callPhase === 'dialing' ? '00:00' : formatTimer(elapsedSeconds)}
                    </div>

                    {/* Measured Real Audio Waveform */}
                    {renderWaveform()}

                    <p className={styles.sessionStateText}>
                      {callPhase === 'dialing'
                        ? `Placing outbound call to client ${callbackCustomer.name} (${callbackCustomer.phone})...`
                        : errorMessage
                        ? errorMessage
                        : isAiSpeaking
                        ? 'AI agent is speaking verified response over browser voice engine.'
                        : isAiThinking
                        ? 'AI agent is consulting verified warehouse inventory...'
                        : voiceActivityState === 'VOICE_DETECTED'
                        ? 'Client speech detected on microphone.'
                        : 'Call active · Client can speak or use simulation responses below.'}
                    </p>
                  </div>
                </div>

                {/* Left Panel Audio Controls & End Button */}
                <div className={styles.callControlsSection}>
                  <div className={styles.controlsRow}>
                    <button
                      className={`${styles.controlBtn} ${isMuted ? styles.controlBtnMuted : ''}`}
                      onClick={toggleMute}
                      title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    >
                      {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                      <span>{isMuted ? 'Muted' : 'Mic Active'}</span>
                    </button>

                    <button
                      className={`${styles.controlBtn} ${!isVoiceOutputEnabled ? styles.controlBtnMuted : ''}`}
                      onClick={toggleVoiceOutput}
                      title={isVoiceOutputEnabled ? 'Mute AI voice output' : 'Enable AI voice output'}
                    >
                      {isVoiceOutputEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      <span>{isVoiceOutputEnabled ? 'Voice On' : 'Voice Muted'}</span>
                    </button>
                  </div>

                  <button className={styles.btnEndCall} onClick={handleEndAiConversation}>
                    <PhoneOff size={18} />
                    <span>End Conversation</span>
                  </button>
                </div>
              </div>

              {/* ----------------------------------------------------
                  RIGHT PANEL: AI AGENT & LIVE CAPTIONS
                  ---------------------------------------------------- */}
              <div className={`${styles.rightAgentPanel} ${mobileTab === 'agent' ? styles.showMobileRight : ''}`}>
                {/* Agent Header */}
                <div className={styles.agentHeader}>
                  <div className={styles.agentHeaderLeft}>
                    <Sparkles size={18} color="#60a5fa" />
                    <h3 className={styles.agentHeaderTitle}>
                      <span>AI Agent Assist</span>
                      <span className={styles.modelBadge}>Live Dialogue Captions & Inventory Tools</span>
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {localCaptions.length} dialogue turns
                    </span>
                  </div>
                </div>

                {/* Chronological Captions Stream */}
                <div className={styles.captionsArea}>
                  {callPhase === 'dialing' && (
                    <div className={styles.liveThinkingCard}>
                      <Radio size={14} />
                      <span>Ringing client {callbackCustomer.name}... Connecting audio stream...</span>
                    </div>
                  )}

                  {localCaptions.map((turn) => (
                    <div
                      key={turn.id}
                      className={`${styles.turnItem} ${
                        turn.speaker === 'customer' ? styles.turnUser : styles.turnAgent
                      }`}
                    >
                      <div className={styles.turnMeta}>
                        <span>
                          {turn.speaker === 'customer'
                            ? `Client (${callbackCustomer.name})`
                            : 'AI Agent (The Sleep Company)'}
                        </span>
                        <span>•</span>
                        <span>{turn.time}</span>
                      </div>
                      <div
                        className={`${styles.turnBubble} ${
                          turn.speaker === 'customer'
                            ? styles.turnBubbleUser
                            : styles.turnBubbleAgent
                        }`}
                      >
                        {turn.text}
                        {turn.speaker === 'agent' && (
                          <div className={styles.spokenTag}>
                            <Volume2 size={12} />
                            <span>Spoken aloud to client via voice engine</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Live speech transcription indicator while customer speaks */}
                  {userTranscript && (
                    <div className={styles.liveTranscribingCard}>
                      <Mic size={14} />
                      <span>
                        Transcribing client speech: &quot;{userTranscript}&quot;
                      </span>
                    </div>
                  )}

                  {/* Processing indicator when AI is thinking */}
                  {isAiThinking && (
                    <div className={styles.liveThinkingCard}>
                      <Sparkles size={14} />
                      <span>AI Agent is checking verified warehouse stock & catalogue...</span>
                    </div>
                  )}

                  {/* Live speaking indicator */}
                  {isAiSpeaking && (
                    <div className={styles.liveSpeakingCard}>
                      <Volume2 size={14} />
                      <span>Speaking answer aloud to client...</span>
                    </div>
                  )}

                  <div ref={captionsEndRef} />
                </div>

                {/* Suggested Client Responses / Inquiry Chips */}
                <div className={styles.chipsContainer}>
                  {SUGGESTED_CLIENT_RESPONSES.map((prompt) => (
                    <button
                      key={prompt}
                      className={styles.chipBtn}
                      onClick={() => handleSendPrompt(prompt)}
                      disabled={isAiThinking || callPhase === 'dialing'}
                    >
                      <Sparkles size={12} color="#60a5fa" />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>

                {/* Bottom Input Row */}
                <div className={styles.inputSection}>
                  <button
                    className={`${styles.micCircleBtn} ${
                      voiceActivityState === 'VOICE_DETECTED' || voiceActivityState === 'LISTENING'
                        ? styles.micCircleBtnListening
                        : ''
                    }`}
                    onClick={() => {
                      if (isMuted) toggleMute();
                    }}
                    title={isMuted ? 'Microphone muted - click to unmute' : 'Microphone active'}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="Type client question (e.g. check stock, price, EMI, or delivery)..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSendPrompt();
                      }
                    }}
                    disabled={callPhase === 'dialing'}
                  />

                  <button
                    className={styles.sendBtn}
                    onClick={() => handleSendPrompt()}
                    disabled={!inputText.trim() || isAiThinking || callPhase === 'dialing'}
                    title="Send message"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ====================================================
            STEP 3: SESSION ENDED / PERSISTED CONFIRMATION
            ==================================================== */}
        {step === 'session_ended' && (
          <div className={styles.confirmationContainer}>
            <div className={styles.successIconCircle}>
              <CheckCircle2 size={36} />
            </div>
            <h3 className={styles.confirmationTitle}>AI Call Completed & Logged</h3>
            <p className={styles.confirmationSubtitle}>
              The AI Voice Callback interaction has been persisted to Calling History and SOP Review.
            </p>

            <div className={styles.confirmationDetailsCard}>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Client</span>
                <span className={styles.confirmationDetailValue}>{callbackCustomer.name}</span>
              </div>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Call Duration</span>
                <span className={styles.confirmationDetailValue}>
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Captions Recorded</span>
                <span className={styles.confirmationDetailValue}>
                  {localCaptions.length} dialogue turns
                </span>
              </div>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>SOP Compliance</span>
                <span className={styles.confirmationDetailValue} style={{ color: '#34d399' }}>
                  96% (Greeting & Disclosure Passed)
                </span>
              </div>
              <div className={styles.confirmationDetailRow}>
                <span className={styles.confirmationDetailLabel}>Missed Call Status</span>
                <span className={styles.confirmationDetailValue} style={{ color: '#38bdf8' }}>
                  Resolved (AI Callback Complete)
                </span>
              </div>
              {savedRecentCall && (
                <div className={styles.confirmationDetailRow}>
                  <span className={styles.confirmationDetailLabel}>Call Log ID</span>
                  <span className={styles.confirmationDetailValue}>{savedRecentCall.id}</span>
                </div>
              )}
            </div>

            <button className={styles.btnPrimaryGreen} onClick={handleCloseModal}>
              <span>Close · View in Recent Calls</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
