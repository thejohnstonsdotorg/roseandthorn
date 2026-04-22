import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFamilyStore } from '../stores/familyStore';
import { theme } from '../lib/theme';

interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [familyName, setFamilyName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const { createFamily, addMember } = useFamilyStore();

  const addMemberToList = () => {
    if (memberName.trim().length === 0) return;
    setMembers([...members, memberName.trim()]);
    setMemberName('');
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
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
    for (const name of members) {
      await addMember(name);
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

      {members.map((name, index) => (
        <View
          key={index}
          className="flex-row items-center justify-between p-3 rounded-xl mb-2"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <View className="flex-row items-center">
            <Text className="text-lg mr-3">🙂</Text>
            <Text className="text-base" style={{ color: theme.colors.text }}>
              {name}
            </Text>
          </View>
          <TouchableOpacity onPress={() => removeMember(index)}>
            <Text className="text-lg" style={{ color: theme.colors.rose }}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      ))}

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
