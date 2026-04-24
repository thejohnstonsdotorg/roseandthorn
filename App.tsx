import './global.css';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { SessionStartScreen } from './screens/SessionStartScreen';
import { RoseScreen } from './screens/RoseScreen';
import { ThornScreen } from './screens/ThornScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SessionDetailScreen } from './screens/SessionDetailScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PassPrompt } from './components/PassPrompt';
import { useSessionStore } from './stores/sessionStore';
import { useSettingsStore } from './stores/settingsStore';
import { theme } from './lib/theme';

export default function App() {
  const [screen, setScreen] = useState<'home' | 'setup' | 'sessionStart' | 'rose' | 'thorn' | 'summary' | 'history' | 'sessionDetail' | 'settings'>('home');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const { presentMembers, currentIndex, nextMember, resetSession } = useSessionStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);
  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passTo, setPassTo] = useState<{ name: string; emoji: string } | null>(null);

  const handleStartSession = (firstMember: { name: string; emoji: string }) => {
    setPassTo(firstMember);
    setShowPassPrompt(true);
  };

  const handlePassReady = () => {
    setShowPassPrompt(false);
    setScreen('rose');
  };

  const handleRoseComplete = () => {
    setScreen('thorn');
  };

  const handleThornComplete = () => {
    if (currentIndex < presentMembers.length - 1) {
      nextMember();
      setShowPassPrompt(true);
      setPassTo({
        name: presentMembers[currentIndex + 1].name,
        emoji: presentMembers[currentIndex + 1].avatar_emoji,
      });
    } else {
      setScreen('summary');
    }
  };

  const handleSummaryFinish = () => {
    resetSession();
    setScreen('home');
  };

  const renderScreen = () => {
    if (showPassPrompt && passTo) {
      return <PassPrompt nextMemberName={passTo.name} nextMemberEmoji={passTo.emoji} onReady={handlePassReady} />;
    }

    switch (screen) {
      case 'home':
        return (
          <HomeScreen
            onStart={() => setScreen('sessionStart')}
            onHistory={() => setScreen('history')}
            onSettings={() => setScreen('settings')}
            onSetup={() => setScreen('setup')}
          />
        );
      case 'setup':
        return <SetupScreen onComplete={() => setScreen('home')} />;
      case 'sessionStart':
        return <SessionStartScreen onStartSession={handleStartSession} />;
      case 'rose':
        return <RoseScreen onComplete={handleRoseComplete} />;
      case 'thorn':
        return <ThornScreen onComplete={handleThornComplete} />;
      case 'summary':
        return <SummaryScreen onFinish={handleSummaryFinish} />;
      case 'history':
        return (
          <HistoryScreen
            onBack={() => setScreen('home')}
            onSelectSession={(id) => { setSelectedSessionId(id); setScreen('sessionDetail'); }}
          />
        );
      case 'sessionDetail':
        return selectedSessionId !== null ? (
          <SessionDetailScreen
            sessionId={selectedSessionId}
            onBack={() => setScreen('history')}
          />
        ) : null;
      case 'settings':
        return <SettingsScreen onBack={() => setScreen('home')} onResetFamily={() => setScreen('home')} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
        {renderScreen()}
        <StatusBar style="auto" />
      </View>
    </SafeAreaProvider>
  );
}
