import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Share, Switch } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useFamilyStore } from '../stores/familyStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getDatabase, resetDatabase } from '../db/migrations';
import { theme } from '../lib/theme';
import { isNativeModulePresent } from '../modules/expo-mediapipe-image-gen/src/ExpoMediaPipeImageGenModule';

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

interface SettingsScreenProps {
  onBack: () => void;
  onResetFamily: () => void;
}

export function SettingsScreen({ onBack, onResetFamily }: SettingsScreenProps) {
  const { family, members, addMember, removeMember } = useFamilyStore();
  const { aiImagesEnabled, setAiImagesEnabled, aiModelDownloading, aiModelProgress, startModelDownload } = useSettingsStore();
  const [newMemberName, setNewMemberName] = useState('');

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

  const { resetSettings } = useSettingsStore();

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
      <View className="pt-12 pb-4 px-6 flex-row items-center">
        <TouchableOpacity onPress={onBack} className="mr-4">
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
          Settings
        </Text>
      </View>

      <ScrollView className="px-6">
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
                    <Text className="text-lg mr-3">{member.avatar_emoji}</Text>
                    <Text className="text-base" style={{ color: theme.colors.text }}>
                      {member.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeMember(member.id)}>
                    <Text className="text-lg" style={{ color: theme.colors.rose }}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
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

            {/* AI Images toggle */}
            <View className="mb-6">
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.textMuted }}>
                Generative Imagery
              </Text>
              <View
                className="p-4 rounded-2xl"
                style={{ backgroundColor: theme.colors.surface }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                    AI Images
                  </Text>
                  <Switch
                    value={aiImagesEnabled}
                    disabled={!isNativeModulePresent || aiModelDownloading}
                    onValueChange={(value) => {
                      if (value && !aiImagesEnabled) {
                        Alert.alert(
                          'Enable AI Images?',
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
                      } else if (!value && aiImagesEnabled) {
                        setAiImagesEnabled(false);
                      }
                    }}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={theme.colors.surface}
                  />
                </View>
                <Text className="text-sm" style={{ color: theme.colors.textMuted }}>
                  {!isNativeModulePresent
                    ? 'Requires a physical device with the dev client build. Not available in the emulator.'
                    : aiImagesEnabled
                    ? 'AI artwork enabled. Tap ✨ on any entry to regenerate with AI.'
                    : aiModelDownloading
                    ? 'Downloading model…'
                    : 'Off — procedural artwork used. No download required.'}
                </Text>
                {aiModelDownloading && aiModelProgress !== null && (
                  <DownloadProgressBar fraction={aiModelProgress} />
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
              className="py-4 rounded-2xl items-center mb-8"
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
