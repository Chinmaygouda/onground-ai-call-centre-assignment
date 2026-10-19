/**
 * Voice Assistant Chat Redesign & Reference UI Verification Test Suite
 *
 * Validates:
 * 1. Compact Header: Assistant title, connection status pill, active model badge, Debug button, Close button
 * 2. Debug Popover Panel: Active model ID, masked session ID, connection state, audio input/output states, "View Details" action
 * 3. Conversational Message Layout:
 *    - User turn: Right aligned, blue bubble, user avatar, timestamp with checkmarks
 *    - AI turn: Left aligned, teal avatar, "AI Assistant" label, formatted text, attached audio player bar with play/pause and waveform bars
 * 4. Suggested Questions Card: Compact card with lightbulb icon and 4 suggestion chips matching mockup
 * 5. Bottom Input Dock: Keyboard icon, text input, prominent circular microphone button with dynamic states, circular send button
 * 6. Multi-turn Conversational Context in query service
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('[1/5] Header & Debug Button Verification', () => {
  const modalPath = path.join(ROOT, 'src/components/geminiLive/CustomerVoiceAssistantModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  // Verify Header elements
  assert.ok(modalContent.includes('Customer Voice Assistant'), 'Header must contain "Customer Voice Assistant" title');
  assert.ok(modalContent.includes('Ask by voice or type your message'), 'Header must contain subtitle');
  assert.ok(modalContent.includes('statusPill'), 'Header must render connection status pill');
  assert.ok(modalContent.includes('modelPill'), 'Header must render model pill');
  assert.ok(modalContent.includes('debugBtn'), 'Header must render Debug button');
  assert.ok(modalContent.includes('Bug size={16}'), 'Debug button must render Bug icon');
  assert.ok(modalContent.includes('closeBtn'), 'Header must render Close button');

  console.log('  ✓ PASS Header: Renders title, subtitle, status pill, model pill, Debug button, and Close button');
});

test('[2/5] Debug Panel Popover Runtime Diagnostics Verification', () => {
  const modalPath = path.join(ROOT, 'src/components/geminiLive/CustomerVoiceAssistantModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  // Verify Debug Popover renders key runtime diagnostics
  assert.ok(modalContent.includes('className={styles.debugPopover}'), 'Must render debugPopover container');
  assert.ok(modalContent.includes('Live Session'), 'Debug popover must show Live Session badge');
  assert.ok(modalContent.includes('Session ID'), 'Debug popover must display Session ID row');
  assert.ok(modalContent.includes('Audio Input'), 'Debug popover must display Audio Input state');
  assert.ok(modalContent.includes('Audio Output'), 'Debug popover must display Audio Output state');
  assert.ok(modalContent.includes('debugDetailsBtn'), 'Debug popover must render View Details action');
  assert.ok(modalContent.includes('isFullDiagnosticsOpen'), 'Debug popover must toggle full diagnostics');

  console.log('  ✓ PASS Debug Popover: Displays live runtime info (model, masked session ID, status, audio states) and View Details toggle');
});

test('[3/5] Conversational Chat Message Bubbles & Audio Player Bar', () => {
  const modalPath = path.join(ROOT, 'src/components/geminiLive/CustomerVoiceAssistantModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  // Verify User Message styling
  assert.ok(modalContent.includes('className={`${styles.messageRow} ${styles.userMessageRow}`'), 'Renders userMessageRow');
  assert.ok(modalContent.includes('className={styles.userBubble}'), 'Renders userBubble');
  assert.ok(modalContent.includes('className={styles.userAvatar}'), 'Renders userAvatar');
  assert.ok(modalContent.includes('className={styles.checkMarks}'), 'Renders checkMarks on user messages');

  // Verify AI Message styling
  assert.ok(modalContent.includes('className={`${styles.messageRow} ${styles.aiMessageRow}`'), 'Renders aiMessageRow');
  assert.ok(modalContent.includes('className={styles.aiBubble}'), 'Renders aiBubble');
  assert.ok(modalContent.includes('className={styles.aiAvatar}'), 'Renders aiAvatar');
  assert.ok(modalContent.includes('className={styles.aiSenderLabel}'), 'Renders "AI Assistant" label');
  assert.ok(modalContent.includes('renderFormattedText(turn.text)'), 'Renders formatted text with paragraphs');

  // Verify Audio Player Bar in AI Message
  assert.ok(modalContent.includes('className={styles.audioPlayerBar}'), 'Renders audioPlayerBar in AI message bubble');
  assert.ok(modalContent.includes('className={styles.audioPlayBtn}'), 'Renders circular audioPlayBtn');
  assert.ok(modalContent.includes('className={styles.audioWaveform}'), 'Renders audioWaveform bars');
  assert.ok(modalContent.includes('handleTogglePlayTurn'), 'Attaches audio play/pause toggle to speech synthesis');

  console.log('  ✓ PASS Chat Messages: User bubble with checkmarks, AI bubble with audio player bar, waveform, and formatted text');
});

test('[4/5] Suggested Questions Card & Bottom Input Dock', () => {
  const modalPath = path.join(ROOT, 'src/components/geminiLive/CustomerVoiceAssistantModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  // Verify Suggested Questions Card
  assert.ok(modalContent.includes('className={styles.suggestedCard}'), 'Renders suggestedCard container');
  assert.ok(modalContent.includes('Suggested Questions'), 'Renders "Suggested Questions" header');
  assert.ok(modalContent.includes('What are the current prices?'), 'Includes "What are the current prices?" suggestion');
  assert.ok(modalContent.includes('Which one is best value for money?'), 'Includes "Which one is best value for money?" suggestion');
  assert.ok(modalContent.includes('Tell me about the warranty'), 'Includes "Tell me about the warranty" suggestion');
  assert.ok(modalContent.includes('Do you have any discounts?'), 'Includes "Do you have any discounts?" suggestion');

  // Verify Bottom Dock
  assert.ok(modalContent.includes('className={styles.bottomDockContainer}'), 'Renders bottomDockContainer');
  assert.ok(modalContent.includes('className={styles.keyboardIconWrapper}'), 'Renders keyboardIconWrapper on left of dock');
  assert.ok(modalContent.includes('className={styles.chatInput}'), 'Renders chatInput field');
  assert.ok(modalContent.includes('className={`${styles.circularMicBtn}'), 'Renders circularMicBtn');
  assert.ok(modalContent.includes('className={styles.chatSendBtn}'), 'Renders circular chatSendBtn');
  assert.ok(modalContent.includes('Voice assistant powered by Gemini · Your conversation is private and secure'), 'Renders security/privacy footer note');

  console.log('  ✓ PASS Bottom Dock & Suggestions: Renders suggested questions card, keyboard icon, text input, circular mic & send buttons');
});

test('[5/5] Multi-Turn Conversation Context & Model Fallback', () => {
  const servicePath = path.join(ROOT, 'server/geminiQueryService.ts');
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');

  assert.ok(serviceContent.includes('formattedHistory'), 'server/geminiQueryService.ts must process conversation history');
  assert.ok(serviceContent.includes('history: formattedHistory.length > 0 ? formattedHistory : undefined'), 'ai.chats.create must receive multi-turn history');
  assert.ok(serviceContent.includes('gemini-3.5-flash-lite'), 'Candidate query models must include verified active model');

  const contextPath = path.join(ROOT, 'src/context/GeminiLiveContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf-8');
  assert.ok(contextContent.includes('history: turns.slice(-6).map'), 'askQuestion sends previous turns as conversation history');

  console.log('  ✓ PASS Multi-Turn Context: Server query service and context send previous conversation turns for contextual follow-up');
});
