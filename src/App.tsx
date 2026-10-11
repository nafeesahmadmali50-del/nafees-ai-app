/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { MessageInput } from './components/MessageInput';
import { StudyModeModal } from './components/StudyModeModal';
import { BusinessModeModal } from './components/BusinessModeModal';
import { VoiceChatScreen } from './components/VoiceChatScreen';
import { ImageGenScreen } from './components/ImageGenScreen';
import { VideoGenScreen } from './components/VideoGenScreen';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { AuthScreen } from './components/AuthScreen';
import { ProfileModal } from './components/ProfileModal';
import {
  Conversation,
  Message,
  AppMode,
  AppSettings,
  ChatAttachment,
  UserProfile,
} from './types';
import {
  loadConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  createNewConversation,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  generateChatTitle,
  isTechnicalErrorText,
  CURRENT_BUSY_MESSAGE,
  cleanAiResponseOutput,
} from './services/storage';
import { getCurrentUser, logoutUser } from './services/auth';
import { streamChatCompletion } from './services/api';
import { speakText } from './services/speech';

export default function App() {
  // Current logged in user
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Load settings for active user
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings(currentUser?.id));

  // Load conversations for active user
const [conversations, setConversations] = useState<Conversation[]>(() => {
  if (!currentUser?.id) return [];

  const stored = loadConversations(currentUser.id);
  const freshChat = createNewConversation('normal');

  // पुरानी खाली chats हटेंगी, पुरानी असली chats History में रहेंगी
  const oldChats = stored.filter((chat) => chat.messages.length > 0);

  return [freshChat, ...oldChats];
});

// App हमेशा नई खाली chat से खुलेगा
const [activeChatId, setActiveChatIdState] = useState<string>(() => {
  return conversations[0]?.id || '';
});
  // App से बाहर जाकर वापस आने पर नई खाली chat खोलें
const wasAppHiddenRef = useRef(false);

useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      wasAppHiddenRef.current = true;
      return;
    }

    if (document.visibilityState === 'visible' && wasAppHiddenRef.current) {
      wasAppHiddenRef.current = false;

      const freshChat = createNewConversation('normal');

      setConversations((prev) => [
        freshChat,
        ...prev.filter((chat) => chat.messages.length > 0),
      ]);

      setActiveChatIdState(freshChat.id);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);

  // Modals & Panels
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [isVoiceScreenOpen, setIsVoiceScreenOpen] = useState(false);
  const [isImageGenOpen, setIsImageGenOpen] = useState(false);
  const [isVideoGenOpen, setIsVideoGenOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [retryNotice, setRetryNotice] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync active conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeChatId) || conversations[0];
  }, [conversations, activeChatId]);

  // Persist conversations (strictly isolated per authenticated user)
  useEffect(() => {
    if (currentUser?.id && conversations.length > 0) {
      saveConversations(conversations, currentUser.id);
    }
  }, [conversations, currentUser?.id]);

  // Persist active ID
  useEffect(() => {
    if (currentUser?.id && activeChatId) {
      setActiveConversationId(activeChatId, currentUser.id);
    }
  }, [activeChatId, currentUser?.id]);

  // Persist settings
  useEffect(() => {
    if (currentUser?.id) {
      saveSettings(settings, currentUser.id);
    }
  }, [settings, currentUser?.id]);

  // Auth Handlers
  const handleLoginSuccess = (user: UserProfile) => {
    // 1. Abort any previous pending requests to guarantee clean session isolation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingText('');
    setRetryNotice(null);

    // 2. Set current user
    setCurrentUser(user);

    // 3. Initialize isolated conversations for this user
    const userConvs = loadConversations(user.id);
    const initialConvs = userConvs.length > 0 ? userConvs : [createNewConversation('normal')];
    setConversations(initialConvs);

    // 4. Set active chat id
    const savedActiveId = getActiveConversationId(user.id);
    const activeId = savedActiveId && initialConvs.some(c => c.id === savedActiveId) ? savedActiveId : initialConvs[0].id;
    setActiveChatIdState(activeId);

    // 5. Initialize user AI settings
    const userSettings = loadSettings(user.id);
    setSettings(userSettings);
  };

  const handleLogout = () => {
    // 1. Abort any streaming or speech
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingText('');
    setRetryNotice(null);

    // 2. Clear current session and remove stored active tokens
    logoutUser();
    setCurrentUser(null);

    // 3. Reset in-memory chat state and settings so previous user's chats and preferences don't linger in React state
    setConversations([]);
    setActiveChatIdState('');
    setSettings({ ...DEFAULT_SETTINGS });

    // 4. Close all open screens & modals immediately
    setIsProfileModalOpen(false);
    setIsSidebarOpen(false);
    setIsStudyModalOpen(false);
    setIsBusinessModalOpen(false);
    setIsVoiceScreenOpen(false);
    setIsImageGenOpen(false);
    setIsVideoGenOpen(false);
    setIsSettingsModalOpen(false);
    setIsHelpModalOpen(false);
  };

  // Switch chat
  const handleSelectChat = (id: string) => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveChatIdState(id);
  };

  // Create new chat
  const handleNewChat = (mode: AppMode = 'normal') => {
    if (isStreaming) {
      handleStopStreaming();
    }
    const newChat = createNewConversation(mode);
    setConversations((prev) => [newChat, ...prev]);
    setActiveChatIdState(newChat.id);
  };

  // Delete conversation
  const handleDeleteChat = (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (updated.length === 0) {
        const fresh = createNewConversation('normal');
        setActiveChatIdState(fresh.id);
        return [fresh];
      }
      if (activeChatId === id) {
        setActiveChatIdState(updated[0].id);
      }
      return updated;
    });
  };

  // Rename conversation
  const handleRenameChat = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  // Clear all chats
  const handleClearAllChats = () => {
    const fresh = createNewConversation('normal');
    setConversations([fresh]);
    setActiveChatIdState(fresh.id);
  };

  // Stop streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setRetryNotice(null);

    // If there was partial streaming text, commit it as model response
    if (streamingText.trim() && activeConversation) {
      const partialMessage: Message = {
        id: 'msg_' + Date.now(),
        role: 'model',
        text: cleanAiResponseOutput(streamingText.trim()),
        timestamp: Date.now(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, messages: [...c.messages, partialMessage], updatedAt: Date.now() }
            : c
        )
      );
    }
    setStreamingText('');
  };

  // Reusable streaming logic
  const startStreamingForMessages = (
    messagesToStream: Message[],
    targetConvId: string,
    effectiveMode: AppMode,
    activeAttachment?: ChatAttachment
  ) => {
    setIsStreaming(true);
    setStreamingText('');
    setRetryNotice(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let accumulatedText = '';

    streamChatCompletion({
      messages: messagesToStream,
      model: settings?.model || 'gemini-3.5-flash-lite',
      modelMode: settings?.modelMode || 'fast',
      mode: effectiveMode,
      language: settings?.uiLanguage || 'hi',
      activeAttachment,
      signal: abortController.signal,
      onChunk: (chunk) => {
        accumulatedText += chunk;
        setStreamingText(accumulatedText);
        setRetryNotice(null);
      },
      onRetryNotice: (notice) => {
        setRetryNotice(notice);
      },
      onError: (errMsg) => {
        setIsStreaming(false);
        setStreamingText('');
        setRetryNotice(null);
        const cleanError = isTechnicalErrorText(errMsg)
          ? CURRENT_BUSY_MESSAGE
          : (errMsg || CURRENT_BUSY_MESSAGE);
        const errMessage: Message = {
          id: 'msg_' + Date.now() + '_err',
          role: 'model',
          text: cleanError,
          timestamp: Date.now(),
          isError: true,
        };
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConvId
              ? { ...c, messages: [...c.messages, errMessage], updatedAt: Date.now() }
              : c
          )
        );
      },
      onComplete: () => {
        setIsStreaming(false);
        setRetryNotice(null);
        const lastUserPrompt = messagesToStream[messagesToStream.length - 1]?.text || '';
        const finalText = cleanAiResponseOutput(accumulatedText.trim(), lastUserPrompt);
        setStreamingText('');

        if (finalText) {
          const aiMessage: Message = {
            id: 'msg_' + Date.now() + '_ai',
            role: 'model',
            text: finalText,
            timestamp: Date.now(),
          };
          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetConvId
                ? { ...c, messages: [...c.messages, aiMessage], updatedAt: Date.now() }
                : c
            )
          );

          // Auto-speak if enabled in settings
          if (settings.autoSpeak) {
            speakText(finalText, {
              lang: settings.speechLang || 'hi-IN',
              rate: settings.voiceRate || 1.0,
            });
          }
        } else {
          // If stream finished without text, show retry notice
          const fallbackErrMsg: Message = {
            id: 'msg_' + Date.now() + '_err',
            role: 'model',
            text: 'AI से जवाब नहीं मिला। कृपया फिर कोशिश करें।',
            timestamp: Date.now(),
            isError: true,
          };
          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetConvId
                ? { ...c, messages: [...c.messages, fallbackErrMsg], updatedAt: Date.now() }
                : c
            )
          );
        }
      },
    });
  };

  // Send message
  const handleSendMessage = (text: string, attachment?: ChatAttachment, overrideMode?: AppMode) => {
    if (!text && !attachment && !activeConversation?.activeAttachment) return;
    if (!activeConversation) return;

    const effectiveMode = overrideMode || activeConversation.mode;
    const effectiveAttachment = attachment || activeConversation.activeAttachment;

    const userMessage: Message = {
      id: 'msg_' + Date.now() + '_u',
      role: 'user',
      text: text || (attachment ? `संलग्न फ़ाइल: ${attachment.name}` : ''),
      attachment,
      timestamp: Date.now(),
    };

    // Determine if title should be updated from first message
    const isFirstMessage = activeConversation.messages.length === 0;
    const fallbackTitle = attachment?.name ? `फ़ाइल: ${attachment.name}` : 'नई बातचीत';
    const newTitle = isFirstMessage ? (text ? generateChatTitle(text) : fallbackTitle) : activeConversation.title;

    // Update conversation with user message and activeAttachment
    const updatedMessages = [...activeConversation.messages, userMessage];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              title: newTitle,
              mode: effectiveMode,
              messages: updatedMessages,
              activeAttachment: attachment || c.activeAttachment,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    // Start streaming for messages
    startStreamingForMessages(
      updatedMessages,
      activeConversation.id,
      effectiveMode,
      effectiveAttachment
    );
  };

  // Retry message on error while preserving user's message
  const handleRetryMessage = (errorMsgId: string) => {
    if (!activeConversation || isStreaming) return;
    const msgs = activeConversation.messages;
    const errIndex = msgs.findIndex((m) => m.id === errorMsgId);
    if (errIndex === -1) return;

    // Remove the error message from conversation, preserving the user message
    const cleanMsgs = msgs.filter((m) => m.id !== errorMsgId);
    const messagesToStream = cleanMsgs.slice(0, errIndex);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id ? { ...c, messages: cleanMsgs, updatedAt: Date.now() } : c
      )
    );

    startStreamingForMessages(
      messagesToStream,
      activeConversation.id,
      activeConversation.mode,
      activeConversation.activeAttachment
    );
  };

  // Regenerate last response
  const handleRegenerate = () => {
    if (!activeConversation || activeConversation.messages.length === 0 || isStreaming) return;

    const msgs = [...activeConversation.messages];
    // Find last user message
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const lastUserMsg = msgs[lastUserIndex];
    // Slice up to before last user msg
    const previousMessages = msgs.slice(0, lastUserIndex);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id ? { ...c, messages: previousMessages } : c
      )
    );

    // Re-send
    handleSendMessage(lastUserMsg.text, lastUserMsg.attachment);
  };

  // Handle prompt selected from Study or Business modals
  const handleSelectToolPrompt = (prompt: string, toolTitle: string, mode: AppMode) => {
    // If currently empty or different mode, apply mode
    if (activeConversation) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, mode, title: c.messages.length === 0 ? toolTitle : c.title }
            : c
        )
      );
    }
    handleSendMessage(prompt, undefined, mode);
  };

  // Voice Chat screen to Chat transfer
  const handleVoiceToChat = (userPrompt: string, aiResponse: string, voiceMode: AppMode) => {
    setIsVoiceScreenOpen(false);
    const newChat = createNewConversation(voiceMode);
    newChat.title = generateChatTitle(userPrompt);
    newChat.messages = [
      {
        id: 'msg_' + Date.now() + '_v_u',
        role: 'user',
        text: userPrompt,
        timestamp: Date.now() - 2000,
      },
      {
        id: 'msg_' + Date.now() + '_v_a',
        role: 'model',
        text: aiResponse,
        timestamp: Date.now(),
      },
    ];

    setConversations((prev) => [newChat, ...prev]);
    setActiveChatIdState(newChat.id);
  };

  // Mode switch helper
  const handleSetMode = (m: AppMode) => {
    if (activeConversation) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, mode: m } : c))
      );
    }
  };

  // If no user is logged in, show clean AuthScreen (Login / Create Account)
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`flex h-[100dvh] w-full flex-col ${settings.theme === 'oled-black' ? 'bg-black' : settings.theme === 'midnight-blue' ? 'bg-[#030712]' : 'bg-[#050811]'} text-slate-100 overflow-hidden select-none font-sans`}>
      {/* Top Header */}
      <Header
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onNewChat={() => handleNewChat('normal')}
        onOpenVoice={() => setIsVoiceScreenOpen(true)}
        onOpenModeModal={(m) => {
          if (m === 'study') setIsStudyModalOpen(true);
          else setIsBusinessModalOpen(true);
        }}
        currentMode={activeConversation?.mode || 'normal'}
        settings={settings}
        onSetMode={handleSetMode}
        onOpenImageGen={() => setIsImageGenOpen(true)}
        onOpenVideoGen={() => setIsVideoGenOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        user={currentUser}
      />

      {/* Main Chat Screen (Always First Screen) */}
      <main className="flex flex-1 flex-col overflow-hidden relative">
        <ChatView
          messages={activeConversation?.messages || []}
          isStreaming={isStreaming}
          streamingText={streamingText}
          retryNotice={retryNotice}
          onSendPrompt={(prompt) => handleSendMessage(prompt)}
          onRegenerate={handleRegenerate}
          onRetryMessage={handleRetryMessage}
          currentMode={activeConversation?.mode || 'normal'}
          settings={settings}
          onOpenStudyTools={() => setIsStudyModalOpen(true)}
          onOpenBusinessTools={() => setIsBusinessModalOpen(true)}
        />

        {/* Bottom Message Input Dock */}
        <MessageInput
          onSendMessage={(text, attachment) => handleSendMessage(text, attachment)}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          speechLang={settings.speechLang}
          uiLanguage={settings.uiLanguage}
          currentMode={activeConversation?.mode || 'normal'}
          activeAttachment={activeConversation?.activeAttachment}
          onClearActiveAttachment={() => {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeConversation?.id ? { ...c, activeAttachment: undefined } : c
              )
            );
          }}
        />
      </main>

      {/* Side Navigation Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onClearAllChats={handleClearAllChats}
        onOpenVoice={() => setIsVoiceScreenOpen(true)}
        onOpenStudyTools={() => setIsStudyModalOpen(true)}
        onOpenBusinessTools={() => setIsBusinessModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        user={currentUser}
        settings={settings}
        onSetMode={handleSetMode}
        onOpenImageGen={() => setIsImageGenOpen(true)}
        onOpenVideoGen={() => setIsVideoGenOpen(true)}
      />

      {/* Study Mode Modal */}
      <StudyModeModal
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
        onSelectPrompt={(prompt, title) => handleSelectToolPrompt(prompt, title, 'study')}
        uiLanguage={settings.uiLanguage}
      />

      {/* Business Mode Modal */}
      <BusinessModeModal
        isOpen={isBusinessModalOpen}
        onClose={() => setIsBusinessModalOpen(false)}
        onSelectPrompt={(prompt, title) => handleSelectToolPrompt(prompt, title, 'business')}
        uiLanguage={settings.uiLanguage}
      />

      {/* Dedicated Image Generation Screen */}
      <ImageGenScreen
        isOpen={isImageGenOpen}
        onClose={() => setIsImageGenOpen(false)}
        settings={settings}
        userId={currentUser?.id}
      />

      {/* Dedicated Video Generation Screen */}
      <VideoGenScreen
        isOpen={isVideoGenOpen}
        onClose={() => setIsVideoGenOpen(false)}
        settings={settings}
      />

      {/* Separate Voice Chat Screen */}
      <VoiceChatScreen
        isOpen={isVoiceScreenOpen}
        onClose={() => setIsVoiceScreenOpen(false)}
        onSendToChatAndOpen={handleVoiceToChat}
        settings={settings}
        initialMode={activeConversation?.mode || 'normal'}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onClearAllChats={handleClearAllChats}
        chatCount={conversations.length}
        conversations={conversations}
      />

      {/* User Profile Modal */}
      {currentUser && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={currentUser}
          onUpdateUser={(updated) => setCurrentUser(updated)}
          onLogout={handleLogout}
          chatCount={conversations.length}
          settings={settings}
        />
      )}

      {/* Help & Support Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        uiLanguage={settings.uiLanguage}
      />
    </div>
  );
}
