import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore, SessionEntry } from '../stores/sessionStore';
import { getDatabase } from '../db/migrations';
import { theme } from '../lib/theme';
import { EntryArtwork } from '../components/EntryArtwork';
import { useEntryImage } from '../hooks/useEntryImage';
import type { ImageSource } from '../lib/imageGen';

/**
 * Clamp an image_source string to the values the DB CHECK constraint accepts.
 * Returns null for any unrecognised value so the DB column stays NULL rather
 * than triggering a CHECK constraint violation.
 *
 * Known failure modes for handleSave (ranked by likelihood for internal-track v1.0.0):
 *   1. CHECK constraint on image_source — old DB may have constraint without 'cloud'.
 *      Fixed by this clamp + migration-3 stale-cache fix in db/migrations.ts.
 *   2. Migration-3 stale-cache bug — tableNames Set built before RENAME, so rose_old
 *      recovery INSERT never ran. Fixed in db/migrations.ts B.3.
 *   3. Double-tap re-entry — two concurrent INSERTs for the same session.
 *      Fixed by the `saving` guard (B.2).
 *   4. NULL content in NOT NULL column — entry.rose/thorn guarded by truthiness
 *      check below; explicit undefined log added for prompt/answer fields.
 */
function clampImageSource(s: string | undefined): ImageSource | null {
  const valid: ImageSource[] = ['procedural', 'mediapipe', 'cloud', 'apple-playground'];
  return valid.includes(s as ImageSource) ? (s as ImageSource) : null;
}

// Sub-component: wraps a single rose or thorn artwork with the regenerate hook
interface ArtworkWithRegenerateProps {
  imageUri?: string;
  seed?: number;
  text: string;
  memberName: string;
  memberEmoji?: string;
  memberId: number;
  mood: 'rose' | 'thorn';
  onNewImage?: (uri: string, seed: number, source: ImageSource, prompt: string) => void;
}

function ArtworkWithRegenerate({
  imageUri,
  seed,
  text,
  memberName,
  memberEmoji,
  memberId,
  mood,
  onNewImage,
}: ArtworkWithRegenerateProps) {
  const filenameBase = `${mood}-summary-${memberId}-${Date.now()}`;
  const { imageUri: liveUri, aiGenerating, showAiRegenerate, regenerateWithAI } = useEntryImage({
    currentUri: imageUri,
    currentSeed: seed,
    text,
    memberName,
    memberEmoji,
    mood,
    filenameBase,
    onNewImage,
  });

  return (
    <EntryArtwork
      imageUri={liveUri}
      label={`${memberName}'s ${mood} artwork`}
      size={240}
      showAiRegenerate={showAiRegenerate}
      onRegenerateWithAI={regenerateWithAI}
      aiGenerating={aiGenerating}
    />
  );
}

interface SummaryScreenProps {
  onFinish: () => void;
}

export function SummaryScreen({ onFinish }: SummaryScreenProps) {
  const { entries, updateEntryByMemberId } = useSessionStore();
  const [word, setWord] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSave = async () => {
    // Guard against double-tap re-entry and re-fire after success
    if (saving || saved) return;
    setSaving(true);
    let succeeded = false;
    try {
      const db = await getDatabase();
      const now = Date.now();

      // Get family
      const families = await db.getAllAsync<{ id: number }>('SELECT id FROM family LIMIT 1');
      if (families.length === 0) return;
      const familyId = families[0].id;

      // Create session
      const sessionResult = await db.runAsync(
        'INSERT INTO session (family_id, date, closing_word, created_at) VALUES (?, ?, ?, ?)',
        [familyId, now, word.trim(), now]
      );
      const sessionId = sessionResult.lastInsertRowId;

      // Save roses and thorns
      for (const entry of entries) {
        if (entry.rose) {
          if (entry.rosePrompt === undefined || entry.roseAnswer === undefined) {
            console.warn('[SummaryScreen] rose entry has undefined prompt/answer', {
              memberId: entry.memberId,
              rosePrompt: entry.rosePrompt,
              roseAnswer: entry.roseAnswer,
            });
          }
          const roseSource = clampImageSource(entry.roseImageSource);
          await db.runAsync(
            `INSERT INTO rose (session_id, member_id, content, deepening_prompt, deepening_answer, created_at,
             image_uri, image_seed, image_source, image_prompt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              sessionId,
              entry.memberId,
              entry.rose,
              entry.rosePrompt ?? null,
              entry.roseAnswer ?? null,
              now,
              entry.roseImageUri ?? null,
              entry.roseImageSeed ?? null,
              roseSource,
              entry.roseImagePrompt ?? null,
            ]
          );
        }
        if (entry.thorn) {
          if (entry.thornPrompt === undefined || entry.thornAnswer === undefined) {
            console.warn('[SummaryScreen] thorn entry has undefined prompt/answer', {
              memberId: entry.memberId,
              thornPrompt: entry.thornPrompt,
              thornAnswer: entry.thornAnswer,
            });
          }
          const thornSource = clampImageSource(entry.thornImageSource);
          await db.runAsync(
            `INSERT INTO thorn (session_id, member_id, content, deepening_prompt, deepening_answer, created_at,
             image_uri, image_seed, image_source, image_prompt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              sessionId,
              entry.memberId,
              entry.thorn,
              entry.thornPrompt ?? null,
              entry.thornAnswer ?? null,
              now,
              entry.thornImageUri ?? null,
              entry.thornImageSeed ?? null,
              thornSource,
              entry.thornImagePrompt ?? null,
            ]
          );
        }
      }

      succeeded = true;
      setSaved(true);
      setTimeout(() => {
        onFinish();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SummaryScreen] handleSave failed', {
        message,
        stack: err instanceof Error ? err.stack : undefined,
        entriesCount: entries.length,
        closingWord: word,
      });
      Alert.alert(
        'Save Failed',
        `Could not save the session.\n\n${message}\n\nPlease screenshot this and try again.`
      );
    } finally {
      // On the success path, keep saving=true through the 1500 ms "Saved!" display
      // window so the button stays disabled. On the error path, clear it so the
      // user can retry. The local `succeeded` flag avoids reading the stale React
      // state closure (setSaved(true) is async — `saved` is still false here).
      if (!succeeded) {
        setSaving(false);
      }
    }
  };

  return (
    <ScrollView
      className="flex-1 px-6"
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="pb-4 items-center" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-4xl mb-2">🌟</Text>
        <Text className="text-3xl font-bold mb-2 text-center" style={{ color: theme.colors.text }}>
          Wonderful Sharing
        </Text>
        <Text className="text-base text-center" style={{ color: theme.colors.textMuted }}>
          Everyone has shared their roses and thorns.
        </Text>
      </View>

      <View className="mt-4 mb-6">
        {entries.map((entry, index) => (
          <View
            key={index}
            className="p-4 rounded-2xl mb-3"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View className="flex-row items-center mb-3">
              <Text className="text-2xl mr-2">{entry.memberEmoji}</Text>
              <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                {entry.memberName}
              </Text>
            </View>

            {entry.rose ? (
              <View className="mb-3">
                <Text className="text-sm font-semibold mb-1" style={{ color: theme.colors.rose }}>
                  Rose
                </Text>
                <ArtworkWithRegenerate
                  imageUri={entry.roseImageUri}
                  seed={entry.roseImageSeed}
                  text={entry.rose}
                  memberName={entry.memberName}
                  memberEmoji={entry.memberEmoji}
                  memberId={entry.memberId}
                  mood="rose"
                  onNewImage={(uri, seed, source, prompt) => {
                    updateEntryByMemberId(entry.memberId, {
                      roseImageUri: uri,
                      roseImageSeed: seed,
                      roseImageSource: source,
                      roseImagePrompt: prompt,
                    });
                  }}
                />
                <Text className="text-base mt-2" style={{ color: theme.colors.text }}>
                  {entry.rose}
                </Text>
              </View>
            ) : null}

            {entry.thorn ? (
              <View>
                <Text className="text-sm font-semibold mb-1" style={{ color: theme.colors.emerald }}>
                  Thorn
                </Text>
                <ArtworkWithRegenerate
                  imageUri={entry.thornImageUri}
                  seed={entry.thornImageSeed}
                  text={entry.thorn}
                  memberName={entry.memberName}
                  memberEmoji={entry.memberEmoji}
                  memberId={entry.memberId}
                  mood="thorn"
                  onNewImage={(uri, seed, source, prompt) => {
                    updateEntryByMemberId(entry.memberId, {
                      thornImageUri: uri,
                      thornImageSeed: seed,
                      thornImageSource: source,
                      thornImagePrompt: prompt,
                    });
                  }}
                />
                <Text className="text-base mt-2" style={{ color: theme.colors.text }}>
                  {entry.thorn}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {!saved ? (
        <>
          <Text className="text-base font-semibold mb-2 text-center" style={{ color: theme.colors.text }}>
            One word to describe our family's day:
          </Text>
          <TextInput
            className="border rounded-2xl p-4 text-base text-center mb-6"
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
            }}
            placeholder="Grateful, chaotic, peaceful..."
            placeholderTextColor={theme.colors.textMuted}
            value={word}
            onChangeText={setWord}
          />
          <TouchableOpacity
            onPress={handleSave}
            className="py-4 rounded-2xl items-center mb-4"
            style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.6 : 1 }}
            activeOpacity={0.8}
            disabled={saving}
          >
            <Text className="text-white text-lg font-semibold">Save & Close</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View className="items-center mb-8">
          <Text className="text-2xl font-bold" style={{ color: theme.colors.emerald }}>
            Saved! 🌹
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
