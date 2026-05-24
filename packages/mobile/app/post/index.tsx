import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Sparkle, MicrophoneStage } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, Font, Radius, Shadows } from '../../lib/theme';

const QUICK_EXAMPLES = [
  'Is someone available to write an assignment?',
  'Anyone up for a night walk?',
  'Can someone bring groceries from DMart?',
  'I want to hang out, is someone available?',
  'Looking for someone who reads manhwa',
];

export default function PostEntryScreen() {
  const [text, setText] = useState('');
  const canContinue = text.trim().length > 8;

  const handleContinue = () => {
    if (!canContinue) return;
    router.push({ pathname: '/post/ai-followup', params: { request: text } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <X size={20} color={Colors.textPrimary} weight="bold" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.sparkleWrap}>
              <Sparkle size={14} color={Colors.textPrimary} weight="fill" />
            </View>
            <Text style={styles.headerTitle}>New Request</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.dragHandle} />

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.promptSection}>
            <Text style={styles.promptLabel}>What do you need?</Text>
            <Text style={styles.promptSub}>Just type naturally — AI will help structure it</Text>
          </View>

          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Is someone available to write a 1000 word assignment by tonight?"
              placeholderTextColor={Colors.textPlaceholder}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              maxLength={500}
              textAlignVertical="top"
            />
            <View style={styles.inputFooter}>
              <Text style={styles.charCount}>{text.length}/500</Text>
              <TouchableOpacity style={styles.micBtn}>
                <MicrophoneStage size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.aiNote}>
            <Sparkle size={13} color={Colors.textPrimary} weight="fill" />
            <Text style={styles.aiNoteText}>
              AI may ask 0–2 quick questions only if something is missing
            </Text>
          </View>

          <Text style={styles.examplesLabel}>Try an example</Text>
          <View style={styles.examplesList}>
            {QUICK_EXAMPLES.map((ex, i) => (
              <TouchableOpacity
                key={i}
                style={styles.examplePill}
                onPress={() => setText(ex)}
                activeOpacity={0.8}
              >
                <Text style={styles.exampleText}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.ctaBtn, !canContinue && styles.ctaBtnDisabled]}
            onPress={handleContinue}
            activeOpacity={0.88}
            disabled={!canContinue}
          >
            <Sparkle size={18} color={canContinue ? '#FFFFFF' : Colors.textPlaceholder} weight="fill" />
            <Text style={[styles.ctaBtnText, !canContinue && styles.ctaBtnTextDisabled]}>
              Continue with AI
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sparkleWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.body, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  dragHandle: {
    width: 40, height: 4, borderRadius: Radius.pill,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.base,
  },
  scroll: { flex: 1 },
  promptSection: { paddingHorizontal: Spacing.screenH, marginBottom: Spacing.base },
  promptLabel: { fontSize: FontSize.displayL, fontFamily: Font.serif, color: Colors.textPrimary, letterSpacing: -0.6 },
  promptSub: { fontSize: FontSize.body, fontFamily: Font.sans, color: Colors.textSecondary, marginTop: 5, lineHeight: 22 },
  inputCard: {
    marginHorizontal: Spacing.screenH, backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.border,
    marginBottom: Spacing.md, ...Shadows.sm,
  },
  input: {
    minHeight: 140, padding: Spacing.lg,
    fontSize: FontSize.bodyL, fontFamily: Font.sans,
    color: Colors.textPrimary, lineHeight: 26,
  },
  inputFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.md,
  },
  charCount: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textPlaceholder },
  micBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  aiNote: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.screenH, backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xl,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  aiNoteText: { fontSize: FontSize.bodyS, fontFamily: Font.sans, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  examplesLabel: {
    fontSize: FontSize.bodyS, fontFamily: Font.sansMedium, color: Colors.textSecondary,
    paddingHorizontal: Spacing.screenH, marginBottom: Spacing.sm,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  examplesList: { paddingHorizontal: Spacing.screenH, gap: Spacing.sm },
  examplePill: {
    backgroundColor: Colors.surfaceSoft, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  exampleText: { fontSize: FontSize.body, fontFamily: Font.sans, color: Colors.textPrimary, lineHeight: 22 },
  bottomBar: {
    paddingHorizontal: Spacing.screenH, paddingTop: Spacing.md, paddingBottom: Spacing.xl,
    backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  ctaBtnDisabled: { backgroundColor: Colors.surfaceSoft },
  ctaBtnText: { fontSize: FontSize.bodyL, fontFamily: Font.sansSemibold, color: '#FFFFFF' },
  ctaBtnTextDisabled: { color: Colors.textPlaceholder },
});
