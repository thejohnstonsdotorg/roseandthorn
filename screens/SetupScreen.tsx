import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFamilyStore } from '../stores/familyStore';
import { theme } from '../lib/theme';
import { EmojiPicker, AVATAR_EMOJIS } from '../components/EmojiPicker';

interface PendingMember {
  name: string;
  emoji: string;
}

interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [familyName, setFamilyName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState<PendingMember[]>([]);
  // Which pending member index is being picked for
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const { createFamily, addMember } = useFamilyStore();

  const addMemberToList = () => {
    if (memberName.trim().length === 0) return;
    // Rotate through the emoji list so each new member gets a distinct default
    const defaultEmoji = AVATAR_EMOJIS[members.length % AVATAR_EMOJIS.length];
    setMembers([...members, { name: memberName.trim(), emoji: defaultEmoji }]);
    setMemberName('');
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateEmoji = (index: number, emoji: string) => {
    setMembers(members.map((m, i) => (i === index ? { ...m, emoji } : m)));
  };

  const handleComplete = async () => {
    if (familyName.trim().length === 0) {
      Alert.alert('Family Name Required', 'Please enter a name for your family.');
      return;
    }
    if (members.length === 0) {
      Alert.alert('Add Members', 'Please add at least one family member.');
      return;
    }

    await createFamily(familyName.trim());
    for (const m of members) {
      await addMember(m.name, m.emoji);
    }
    onComplete();
  };

  return (
    <ScrollView className="flex-1 px-6" style={{ backgroundColor: theme.colors.background }}>
      <View className="pt-12 pb-6">
        <Text className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>
          Create Your Family
        </Text>
        <Text className="text-base" style={{ color: theme.colors.textMuted }}>
          Let's set up your Rose & Thorn circle.
        </Text>
      </View>

      <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>
        Family Name
      </Text>
      <TextInput
        className="border rounded-xl p-3 text-base mb-6"
        style={{ borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }}
        placeholder="The Johnsons"
        placeholderTextColor={theme.colors.textMuted}
        value={familyName}
        onChangeText={setFamilyName}
      />

      <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>
        Members
      </Text>
      <View className="flex-row mb-4">
        <TextInput
          className="flex-1 border rounded-xl p-3 text-base mr-2"
          style={{ borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }}
          placeholder="Add a family member"
          placeholderTextColor={theme.colors.textMuted}
          value={memberName}
          onChangeText={setMemberName}
          onSubmitEditing={addMemberToList}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={addMemberToList}
          className="px-4 rounded-xl items-center justify-center"
          style={{ backgroundColor: theme.colors.primary }}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-lg">+</Text>
        </TouchableOpacity>
      </View>

      {members.map((m, index) => (
        <View
          key={index}
          className="flex-row items-center justify-between p-3 rounded-xl mb-2"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <View className="flex-row items-center">
            {/* Tap the emoji badge to pick a different one */}
            <TouchableOpacity
              onPress={() => setPickerIndex(index)}
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
              <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
            </TouchableOpacity>
            <View>
              <Text className="text-base" style={{ color: theme.colors.text }}>{m.name}</Text>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Tap to choose character</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => removeMember(index)}>
            <Text className="text-lg" style={{ color: theme.colors.rose }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Emoji picker for the selected pending member */}
      {pickerIndex !== null && (
        <EmojiPicker
          visible
          current={members[pickerIndex]?.emoji ?? '🙂'}
          onSelect={(emoji) => updateEmoji(pickerIndex, emoji)}
          onClose={() => setPickerIndex(null)}
        />
      )}

      <TouchableOpacity
        onPress={handleComplete}
        className="py-4 rounded-2xl items-center mt-6 mb-8"
        style={{ backgroundColor: theme.colors.primary }}
        activeOpacity={0.8}
      >
        <Text className="text-white text-lg font-semibold">Get Started</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
