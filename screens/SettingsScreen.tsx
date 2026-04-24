import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Share, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { useFamilyStore } from '../stores/familyStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getDatabase, resetDatabase } from '../db/migrations';
import { theme } from '../lib/theme';
import { isNativeModulePresent } from '../modules/expo-mediapipe-image-gen/src/ExpoMediaPipeImageGenModule';
import { EmojiPicker } from '../components/EmojiPicker';
import type { CloudProvider } from '../lib/cloudImage';
import { ENABLE_CLOUD_AI } from '../lib/featureFlags';

function DownloadProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.round((fraction ?? 0) * 100);
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.border,
        overflow: 'hidden',
      }}>
        <View style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.colors.primary,
          width: `${pct}%`,
        }} />
      </View>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
        Downloading model… {pct}%
      </Text>
    </View>
  );
}

/** Simple segmented control for the AI backend tri-state. */
function BackendSegmentedControl({
  value,
  onChange,
}: {
  value: 'off' | 'mediapipe' | 'cloud';
  onChange: (v: 'off' | 'mediapipe' | 'cloud') => void;
}) {
  const options: { key: 'off' | 'mediapipe' | 'cloud'; label: string }[] = [
    { key: 'off', label: 'Off' },
    { key: 'mediapipe', label: 'On-device' },
    // Cloud option shown only when ENABLE_CLOUD_AI flag is on (dev/preview builds).
    ...(ENABLE_CLOUD_AI ? [{ key: 'cloud' as const, label: 'Cloud' }] : []),
  ];
  return (
    <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border }}>
      {options.map((opt, i) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              backgroundColor: active ? theme.colors.primary : theme.colors.surface,
              borderLeftWidth: i > 0 ? 1 : 0,
              borderLeftColor: theme.colors.border,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: active ? '#fff' : theme.colors.text, fontSize: 13, fontWeight: active ? '700' : '400' }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const PROVIDER_LABELS: Record<CloudProvider, string> = {
  fal: 'fal.ai',
  fireworks: 'Fireworks',
  together: 'Together AI',
  replicate: 'Replicate',
  wavespeed: 'WaveSpeed',
};

const PROVIDERS: CloudProvider[] = ['fal', 'fireworks', 'together', 'replicate', 'wavespeed'];

interface SettingsScreenProps {
  onBack: () => void;
  onResetFamily: () => void;
}

export function SettingsScreen({ onBack, onResetFamily }: SettingsScreenProps) {
  const { family, members, addMember, updateMember, removeMember } = useFamilyStore();
  const {
    aiImagesEnabled, setAiImagesEnabled,
    aiBackend, setAiBackend,
    cloudProvider, setCloudProvider,
    cloudApiKey, setCloudApiKey,
    aiModelDownloading, aiModelProgress,
    startModelDownload,
    resetSettings,
    testCloudKey,
  } = useSettingsStore();

  const [newMemberName, setNewMemberName] = useState('');
  const [emojiPickerMemberId, setEmojiPickerMemberId] = useState<number | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState(cloudApiKey);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const insets = useSafeAreaInsets();

  // Compute the tri-state value
  const triState: 'off' | 'mediapipe' | 'cloud' =
    !aiImagesEnabled ? 'off'
    : aiBackend === 'mediapipe' ? 'mediapipe'
    : 'cloud';

  const handleTriStateChange = async (v: 'off' | 'mediapipe' | 'cloud') => {
    setTestResult(null);
    if (v === 'off') {
      await setAiImagesEnabled(false);
      return;
    }
    if (v === 'mediapipe') {
      if (!isNativeModulePresent) {
        Alert.alert('Not available', 'On-device AI requires a physical device with the dev client build.');
        return;
      }
      if (!aiImagesEnabled || aiBackend !== 'mediapipe') {
        Alert.alert(
          'Enable On-device AI?',
          'This downloads about 1.9 GB of AI model files to your device.\n\n'
          + 'All generation stays on your phone — nothing is sent to any server.\n\n'
          + 'Recommend downloading on Wi-Fi.\n\n'
          + 'Images are generated using Stable Diffusion 1.5 via the MediaPipe runtime.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Download & Enable',
              onPress: () => {
                startModelDownload().catch((err) => {
                  Alert.alert(
                    'Download Failed',
                    err?.message ?? 'Unknown error. Please try again.',
                    [{ text: 'OK' }]
                  );
                });
              },
            },
          ]
        );
      }
      return;
    }
    // v === 'cloud'
    await setAiBackend('cloud');
    await setAiImagesEnabled(true);
  };

  const handleSaveApiKey = async () => {
    await setCloudApiKey(apiKeyDraft.trim());
    setTestResult(null);
  };

  const handleTestKey = async () => {
    // Save the current draft first so testCloudKey uses the latest value
    await setCloudApiKey(apiKeyDraft.trim());
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testCloudKey();
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  const handleExport = async () => {
    const db = await getDatabase();
    const families = await db.getAllAsync('SELECT * FROM family');
    const allMembers = await db.getAllAsync('SELECT * FROM member');
    const sessions = await db.getAllAsync('SELECT * FROM session');
    const roses = await db.getAllAsync('SELECT * FROM rose');
    const thorns = await db.getAllAsync('SELECT * FROM thorn');

    const payload = JSON.stringify({ families, members: allMembers, sessions, roses, thorns }, null, 2);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync('data:application/json;base64,' + btoa(payload), {
        mimeType: 'application/json',
        dialogTitle: 'Export Rose & Thorn History',
      });
    } else {
      await Share.share({ message: payload });
    }
  };

  const handleAddMember = async () => {
    if (newMemberName.trim().length === 0) return;
    await addMember(newMemberName.trim());
    setNewMemberName('');
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Everything?',
      'This will delete all family data, history, and app settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetDatabase();
            await resetSettings();
            onResetFamily();
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <View className="pb-4 px-6 flex-row items-center" style={{ paddingTop: insets.top + 8 }}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={{ padding: 8, marginRight: 8 }}
        >
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
          Settings
        </Text>
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        {family ? (
          <>
            <View className="mb-6">
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.textMuted }}>
                Family
              </Text>
              <View
                className="p-4 rounded-2xl"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                  {family.name}
                </Text>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.textMuted }}>
                Members
              </Text>
              {members.map((member) => (
                <View
                  key={member.id}
                  className="flex-row items-center justify-between p-3 rounded-xl mb-2"
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => setEmojiPickerMemberId(member.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: theme.colors.roseLight,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{member.avatar_emoji}</Text>
                    </TouchableOpacity>
                    <View>
                      <Text className="text-base" style={{ color: theme.colors.text }}>
                        {member.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>
                        Tap to change character
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeMember(member.id)}>
                    <Text className="text-lg" style={{ color: theme.colors.rose }}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Emoji picker modal */}
              {emojiPickerMemberId !== null && (() => {
                const m = members.find((x) => x.id === emojiPickerMemberId);
                if (!m) return null;
                return (
                  <EmojiPicker
                    visible
                    current={m.avatar_emoji}
                    onSelect={(emoji) => updateMember(m.id, { avatar_emoji: emoji })}
                    onClose={() => setEmojiPickerMemberId(null)}
                  />
                );
              })()}
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.textMuted }}>
                Add Member
              </Text>
              <View className="flex-row">
                <TextInput
                  className="flex-1 border rounded-xl p-3 text-base mr-2"
                  style={{
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                  }}
                  placeholder="New member name"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                  onSubmitEditing={handleAddMember}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={handleAddMember}
                  className="px-4 rounded-xl items-center justify-center"
                  style={{ backgroundColor: theme.colors.primary }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-bold text-lg">+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* AI Images — tri-state control */}
            <View className="mb-6">
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.textMuted }}>
                Generative Imagery
              </Text>
              <View
                className="p-4 rounded-2xl"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <Text className="text-base font-semibold mb-3" style={{ color: theme.colors.text }}>
                  AI Images
                </Text>

                <BackendSegmentedControl value={triState} onChange={handleTriStateChange} />

                {/* Status / description line */}
                <Text className="text-sm mt-2" style={{ color: theme.colors.textMuted }}>
                  {triState === 'off'
                    ? 'Off — procedural artwork only. No download or API key required.'
                    : triState === 'mediapipe'
                    ? !isNativeModulePresent
                      ? 'Requires a physical device with the dev client build.'
                      : aiModelDownloading
                      ? 'Downloading model…'
                      : aiImagesEnabled && aiBackend === 'mediapipe'
                      ? 'On-device AI enabled. Tap ✨ on any entry to regenerate with AI.'
                      : 'Tap to download the 1.9 GB on-device model.'
                    : ENABLE_CLOUD_AI
                    ? 'Cloud AI enabled. Images generated via FLUX.1 schnell (<2 s on Wi-Fi).'
                    : 'On-device AI is the only available backend in this build.'}
                </Text>

                {/* MediaPipe download progress */}
                {triState === 'mediapipe' && aiModelDownloading && aiModelProgress !== null && (
                  <DownloadProgressBar fraction={aiModelProgress} />
                )}

                {/* Cloud settings — only shown when Cloud is selected AND flag is on */}
                {ENABLE_CLOUD_AI && triState === 'cloud' && (
                  <View style={{ marginTop: 16, gap: 12 }}>
                    {/* Provider picker */}
                    <View>
                      <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 4 }}>
                        Provider
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowProviderPicker((v) => !v)}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.background,
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: theme.colors.text, fontSize: 15 }}>
                          {PROVIDER_LABELS[cloudProvider]}
                        </Text>
                        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                          {showProviderPicker ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>
                      {showProviderPicker && (
                        <View style={{
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          overflow: 'hidden',
                          marginTop: 4,
                        }}>
                          {PROVIDERS.map((p) => (
                            <TouchableOpacity
                              key={p}
                              onPress={() => {
                                setCloudProvider(p);
                                setShowProviderPicker(false);
                                setTestResult(null);
                              }}
                              style={{
                                padding: 12,
                                backgroundColor: p === cloudProvider ? theme.colors.roseLight : theme.colors.surface,
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={{ color: theme.colors.text, fontSize: 15 }}>
                                {PROVIDER_LABELS[p]}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* API Key input */}
                    <View>
                      <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 4 }}>
                        API Key
                      </Text>
                      <TextInput
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.background,
                          color: theme.colors.text,
                          fontSize: 15,
                        }}
                        placeholder="Paste your API key here"
                        placeholderTextColor={theme.colors.textMuted}
                        value={apiKeyDraft}
                        onChangeText={(t) => { setApiKeyDraft(t); setTestResult(null); }}
                        onBlur={handleSaveApiKey}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    {/* Test button + result */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity
                        onPress={handleTestKey}
                        disabled={testing || apiKeyDraft.trim().length === 0}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: apiKeyDraft.trim().length > 0 ? theme.colors.primary : theme.colors.border,
                          opacity: testing ? 0.6 : 1,
                        }}
                        activeOpacity={0.8}
                      >
                        {testing
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Test</Text>
                        }
                      </TouchableOpacity>
                      {testResult && (
                        <Text style={{
                          fontSize: 13,
                          color: testResult.ok ? theme.colors.emerald : theme.colors.rose,
                          flex: 1,
                        }}>
                          {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
                        </Text>
                      )}
                    </View>

                    {/* Cost estimate + key storage note */}
                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, lineHeight: 18 }}>
                      Estimated cost: ~$0.001 per image at 512×512. Your key is stored only on this device.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleExport}
              className="py-4 rounded-2xl items-center mb-4"
              style={{ backgroundColor: theme.colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-semibold">Export History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleReset}
              className="py-4 rounded-2xl items-center mb-4"
              style={{ backgroundColor: theme.colors.roseLight, borderWidth: 1, borderColor: theme.colors.rose }}
              activeOpacity={0.8}
            >
              <Text className="text-lg font-semibold" style={{ color: theme.colors.rose }}>
                Reset All Data
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text className="text-center mt-12" style={{ color: theme.colors.textMuted }}>
            No family configured.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
