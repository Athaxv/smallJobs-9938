import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Check } from "phosphor-react-native";
import { Colors, Spacing, FontSize, Font, Radius, Shadows } from "../lib/theme";
import { profileApi } from "../lib/api";

function AvatarPreview({ name, avatar }: { name: string; avatar?: string | null }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <View style={styles.avatarWrap}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{initials || "?"}</Text>
      </View>
      <Text style={styles.avatarHint}>Avatar upload coming soon</Text>
    </View>
  );
}

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

  const [originalName, setOriginalName] = useState("");

  useEffect(() => {
    profileApi.getMe().then(({ user, profile }) => {
      setName(user.name ?? "");
      setOriginalName(user.name ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const trimName = name.trim();
    if (!trimName) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    setSaving(true);
    try {
      await profileApi.patch({
        name: trimName,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
      });
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save. Try again.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Check size={18} color="#fff" weight="bold" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <AvatarPreview name={name} />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textPlaceholder}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={bio}
              onChangeText={setBio}
              placeholder="A short intro — who you are, what you help with…"
              placeholderTextColor={Colors.textPlaceholder}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/200</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Location / Neighbourhood</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Koramangala, Bangalore"
              placeholderTextColor={Colors.textPlaceholder}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <Text style={styles.fieldNote}>
              Only your neighbourhood is shown publicly — never your exact address.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.subheading,
    fontFamily: Font.serif,
    color: Colors.textPrimary,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  content: { paddingHorizontal: Spacing.screenH, paddingTop: Spacing.xl },
  avatarWrap: { alignItems: "center", marginBottom: Spacing.xl },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  avatarText: { fontSize: 28, fontFamily: Font.sansBold, color: "#fff" },
  avatarHint: {
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: Colors.textPlaceholder,
  },
  fieldGroup: { marginBottom: Spacing.xl },
  label: {
    fontSize: FontSize.bodyS,
    fontFamily: Font.sansSemibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    letterSpacing: 0.1,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    fontSize: FontSize.body,
    fontFamily: Font.sans,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  inputMulti: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    marginTop: 4,
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: Colors.textPlaceholder,
    textAlign: "right",
  },
  fieldNote: {
    marginTop: 6,
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
