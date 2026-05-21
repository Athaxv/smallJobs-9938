import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, PaperPlaneTilt, DotsThreeVertical } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize, Radius, Font } from '../../lib/theme';
import { API_URL } from '../../lib/config';
import { getSession, getTokenAsync } from '../../lib/auth';

interface ApiMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

interface DisplayMsg {
  id: string;
  sender: 'me' | 'other';
  text: string;
  time: string;
}

function formatMsgTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [myId, setMyId] = useState('');
  useEffect(() => { getSession().then((u) => setMyId(u?.id ?? '')); }, []);

  const [convTitle, setConvTitle] = useState('Thread');
  const [otherName, setOtherName] = useState('...');
  const [messages, setMessages] = useState<DisplayMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const toDisplay = useCallback((msgs: ApiMessage[]): DisplayMsg[] => {
    return msgs.map(m => ({
      id: m.id,
      sender: m.senderId === myId ? 'me' : 'other',
      text: m.body,
      time: formatMsgTime(m.createdAt),
    }));
  }, [myId]);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!id) return;
    try {
      const token = await getTokenAsync();
      const res = await fetch(`${API_URL}/api/messages/conversations/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!mountedRef.current) return;
      if (data.ok) {
        setMessages(toDisplay(data.messages));
        if (!silent) setTimeout(() => {
          if (mountedRef.current) flatRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch {
      // silent fail on poll
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, [id, toDisplay]);

  // Fetch conv info (title, other user) from conversations list
  const fetchConvInfo = useCallback(async () => {
    try {
      const token = await getTokenAsync();
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.ok && mountedRef.current) {
        const conv = data.conversations.find((c: { id: string; postTitle: string; otherUser: { name: string } }) => c.id === id);
        if (conv) {
          setConvTitle(conv.postTitle ?? 'Thread');
          setOtherName(conv.otherUser?.name ?? 'User');
        }
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    fetchConvInfo();
    fetchMessages();

    // Poll every 3 seconds for new messages
    pollingRef.current = setInterval(() => {
      fetchMessages(true);
    }, 3000);

    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages, fetchConvInfo]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Optimistic add
    const optimistic: DisplayMsg = {
      id: `opt-${Date.now()}`,
      sender: 'me',
      text,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => {
      if (mountedRef.current) flatRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const token = await getTokenAsync();
      const res = await fetch(`${API_URL}/api/messages/conversations/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!mountedRef.current) return;
      if (data.ok) {
        // Replace optimistic with real message
        setMessages(prev =>
          prev.map(m => m.id === optimistic.id
            ? { ...m, id: data.message.id }
            : m
          )
        );
      }
    } catch {
      // Keep optimistic message, it will sync on next poll
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.userName}>{otherName}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(otherName)}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{otherName}</Text>
            <Text style={styles.threadTitle} numberOfLines={1}>{convTitle}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <DotsThreeVertical size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.contextStrip}>
        <Text style={styles.contextLabel}>Re: </Text>
        <Text style={styles.contextText} numberOfLines={1}>{convTitle}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => { if (mountedRef.current) flatRef.current?.scrollToEnd({ animated: false }); }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Say hello! Be the first to message.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubbleWrap, item.sender === 'me' && styles.bubbleWrapMe]}>
              {item.sender === 'other' && (
                <View style={styles.smallAvatar}>
                  <Text style={styles.smallAvatarText}>{initials(otherName).charAt(0)}</Text>
                </View>
              )}
              <View style={[styles.bubble, item.sender === 'me' ? styles.bubbleMe : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, item.sender === 'me' && styles.bubbleTextMe]}>
                  {item.text}
                </Text>
                <Text style={[styles.bubbleTime, item.sender === 'me' && { color: 'rgba(255,255,255,0.6)' }]}>
                  {item.time}
                </Text>
              </View>
            </View>
          )}
        />

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textPlaceholder}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color={Colors.textPlaceholder} />
              : <PaperPlaneTilt size={18} color={input.trim() ? '#FFFFFF' : Colors.textPlaceholder} weight="fill" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.sm,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.bodyS, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  userName: { fontSize: FontSize.body, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  threadTitle: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textSecondary, maxWidth: 200 },
  iconBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  contextStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screenH, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceSoft, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  contextLabel: { fontSize: FontSize.caption, fontFamily: Font.sansMedium, color: Colors.textSecondary },
  contextText: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textSecondary, flex: 1 },
  messageList: { padding: Spacing.screenH, gap: Spacing.sm, paddingBottom: Spacing.base },
  emptyChat: { alignItems: 'center', paddingTop: 60 },
  emptyChatText: { fontSize: FontSize.bodyS, fontFamily: Font.sans, color: Colors.textPlaceholder },
  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: Spacing.sm },
  bubbleWrapMe: { flexDirection: 'row-reverse' },
  smallAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  smallAvatarText: { fontSize: FontSize.caption, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  bubble: { maxWidth: '76%', borderRadius: Radius.lg, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: 4 },
  bubbleOther: { backgroundColor: Colors.surfaceSoft, borderBottomLeftRadius: Radius.xs },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: Radius.xs },
  bubbleText: { fontSize: FontSize.body, fontFamily: Font.sans, color: Colors.textPrimary, lineHeight: 22 },
  bubbleTextMe: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 11, fontFamily: Font.sans, color: Colors.textPlaceholder, alignSelf: 'flex-end' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.screenH, paddingVertical: Spacing.md, paddingBottom: Spacing.lg,
    backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  inputWrap: {
    flex: 1, backgroundColor: Colors.surfaceSoft, borderRadius: Radius.xl,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    minHeight: 44, justifyContent: 'center',
  },
  input: { fontSize: FontSize.body, fontFamily: Font.sans, color: Colors.textPrimary, maxHeight: 100 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.surfaceSoft },
});
