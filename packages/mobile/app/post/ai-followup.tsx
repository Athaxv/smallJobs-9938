import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sparkle } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadows, Font } from '../../lib/theme';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://b588iqpvtru3uh0q4bcng-preview-4200.runable.site/';

interface AIQuestion {
  question: string;
  options: string[];
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

const alreadyMentionsPay = (request: string) => {
  const lower = request.toLowerCase();
  return /₹|\bpay\b|\bpaid\b|\bpayment\b|\brupee|\bmoney\b|\bcash\b|\bfee\b|\bcharge\b|\bfree\b|\bvolunteer\b/.test(lower);
};

const getFallbackFlow = (request: string): AIQuestion[] => {
  const lower = request.toLowerCase();
  const hasPay = alreadyMentionsPay(request);
  const payQuestion: AIQuestion = {
    question: 'Will you be paying for this?',
    options: ['No, it\'s a freebie / volunteer', '₹100–300', '₹300–600', '₹600+'],
  };

  if (lower.includes('walk') || lower.includes('hangout') || lower.includes('meet')) {
    const qs: AIQuestion[] = [
      { question: 'Where should this happen?', options: ['Near me (share location)', 'Specific area', 'Online / doesn\'t matter'] },
      { question: 'When do you need this?', options: ['Today', 'This week', 'Flexible'] },
    ];
    if (!hasPay) qs.splice(1, 0, payQuestion);
    return qs;
  }
  if (lower.includes('assign') || lower.includes('write') || lower.includes('help')) {
    const qs: AIQuestion[] = [
      { question: 'Is this remote work or local?', options: ['Remote / online is fine', 'Needs to be local'] },
      { question: 'When is the deadline?', options: ['Within a few hours', 'Tonight', 'Tomorrow', 'This week'] },
    ];
    if (!hasPay) qs.splice(1, 0, payQuestion);
    return qs;
  }
  const qs: AIQuestion[] = [
    { question: 'Should this be shown to people nearby or anyone online?', options: ['Only nearby people', 'Anyone online', 'Both'] },
    { question: 'Any urgency?', options: ['Need it today', 'This week', 'No rush'] },
  ];
  if (!hasPay) qs.splice(1, 0, payQuestion);
  return qs;
};

export default function AIFollowupScreen() {
  const { request } = useLocalSearchParams<{ request: string }>();
  const [flow, setFlow] = useState<AIQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'ai-intro', sender: 'ai', text: `Got it! Just a couple quick questions to set up your thread perfectly.` },
  ]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!request) return;
    fetchQuestions();
  }, [request]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${API_BASE}api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request }),
      });
      const data = await res.json() as { ok: boolean; questions?: AIQuestion[] };
      if (data.ok && data.questions && data.questions.length > 0) {
        setFlow(data.questions);
        setMessages(prev => [...prev, { id: 'ai-q0', sender: 'ai', text: data.questions![0].question }]);
      } else {
        useFallback();
      }
    } catch {
      useFallback();
    } finally {
      setLoading(false);
    }
  };

  const useFallback = () => {
    const fallback = getFallbackFlow(request ?? '');
    setFlow(fallback);
    setMessages(prev => [...prev, { id: 'ai-q0', sender: 'ai', text: fallback[0].question }]);
  };

  const handleOption = (option: string) => {
    const newAnswers = [...answers, option];
    setAnswers(newAnswers);

    const userMsg: Message = { id: `user-${stepIndex}`, sender: 'user', text: option };
    const updated = [...messages, userMsg];

    const nextStep = stepIndex + 1;
    if (nextStep < flow.length) {
      const aiMsg: Message = { id: `ai-q${nextStep}`, sender: 'ai', text: flow[nextStep].question };
      setMessages([...updated, aiMsg]);
      setStepIndex(nextStep);
    } else {
      const doneMsg: Message = {
        id: 'ai-done',
        sender: 'ai',
        text: 'Perfect! I\'ve structured your thread. Review it before posting.',
      };
      setMessages([...updated, doneMsg]);
      setDone(true);
    }

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleContinue = () => {
    router.push({ pathname: '/post/preview', params: { request, answers: JSON.stringify(answers) } });
  };

  const currentStep = flow[stepIndex];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiIndicator}>
            <Sparkle size={13} color={Colors.textPrimary} weight="fill" />
          </View>
          <View>
            <Text style={styles.headerTitle}>SmallJobs AI</Text>
            <Text style={styles.headerSub}>
              {loading ? 'Thinking...' : done ? 'Done!' : 'Building your thread...'}
            </Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress dots */}
      {flow.length > 0 && (
        <View style={styles.progressRow}>
          {flow.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i < answers.length && styles.progressDotDone,
                i === stepIndex && !done && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Request context strip */}
      <View style={styles.requestStrip}>
        <Text style={styles.requestStripLabel}>Your request</Text>
        <Text style={styles.requestStripText} numberOfLines={2}>{request}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(msg => (
            <View
              key={msg.id}
              style={[styles.bubble, msg.sender === 'ai' ? styles.aiBubble : styles.userBubble]}
            >
              {msg.sender === 'ai' && (
                <View style={styles.aiBubbleIcon}>
                  <Sparkle size={11} color={Colors.textPrimary} weight="fill" />
                </View>
              )}
              <Text style={[styles.bubbleText, msg.sender === 'user' && styles.userBubbleText]}>
                {msg.text}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.textPrimary} />
              <Text style={styles.loadingText}>AI is reading your request...</Text>
            </View>
          )}

          {!loading && !done && currentStep?.options && (
            <View style={styles.optionsContainer}>
              {currentStep.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.optionBtn}
                  onPress={() => handleOption(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

        {done && (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.ctaBtn} onPress={handleContinue} activeOpacity={0.88}>
              <Sparkle size={18} color="#FFFFFF" weight="fill" />
              <Text style={styles.ctaBtnText}>Preview my thread</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  aiIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.body,
    fontFamily: Font.sansSemibold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: Colors.textSecondary,
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.md,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: '#CCCCCC',
  },
  progressDotDone: {
    backgroundColor: Colors.primary,
  },
  requestStrip: {
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  requestStripLabel: {
    fontSize: FontSize.caption,
    fontFamily: Font.sansMedium,
    color: Colors.textPlaceholder,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  requestStripText: {
    fontSize: FontSize.bodyS,
    fontFamily: Font.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  chat: { flex: 1 },
  chatContent: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.bodyS,
    fontFamily: Font.sans,
    color: Colors.textSecondary,
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  aiBubble: {
    backgroundColor: Colors.surfaceSoft,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Radius.xs,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: Radius.xs,
    flexDirection: 'row-reverse',
  },
  aiBubbleIcon: {
    marginTop: 2,
  },
  bubbleText: {
    fontSize: FontSize.body,
    fontFamily: Font.sans,
    color: Colors.textPrimary,
    lineHeight: 22,
    flexShrink: 1,
  },
  userBubbleText: {
    color: '#FFFFFF',
  },
  optionsContainer: {
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    width: '100%',
  },
  optionBtn: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  optionText: {
    fontSize: FontSize.body,
    fontFamily: Font.sansMedium,
    color: Colors.textPrimary,
  },
  bottomBar: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ctaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  ctaBtnText: {
    fontSize: FontSize.bodyL,
    fontFamily: Font.sansSemibold,
    color: '#FFFFFF',
  },
});
