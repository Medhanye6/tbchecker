import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';
import { useLanguage } from '../lib/useLanguage';
import { verifyTelebirr, isValidTxid, normalizeTxid } from '../lib/api';
import { saveToHistory } from '../lib/database';

export default function VerifyScreen() {
  const scheme = useColorScheme();
  const colors = COLORS[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useLanguage();
  const router = useRouter();
  const [txid, setTxid] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
      setTxid(cleaned);
    }
  };

  const handleVerify = useCallback(async () => {
    const normalized = normalizeTxid(txid);
    if (!isValidTxid(normalized)) {
      Alert.alert(t('error'), t('enterTxidPlaceholder'));
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await verifyTelebirr(normalized);
      await saveToHistory(normalized, result.success ? 'verified' : 'not_found', result.data);

      setLoading(false);
      Haptics.notificationAsync(
        result.success
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );

      router.push({
        pathname: '/result',
        params: {
          txid: normalized,
          success: result.success ? '1' : '0',
          data: result.data ? JSON.stringify(result.data) : '',
        },
      });
    } catch {
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('error'), t('networkError'));
    }
  }, [txid, t, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="keypad" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t('enterTxid')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('enterTxidPlaceholder')}
          </Text>

          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('enterTxidPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={txid}
              onChangeText={(v) => setTxid(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              editable={!loading}
            />
            <TouchableOpacity onPress={handlePaste} style={styles.pasteBtn} disabled={loading}>
              <Ionicons name="clipboard" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {txid.length}/10
          </Text>

          <TouchableOpacity
            style={[
              styles.verifyBtn,
              {
                backgroundColor:
                  txid.length === 10 && !loading ? colors.primary : colors.border,
              },
            ]}
            onPress={handleVerify}
            disabled={txid.length !== 10 || loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.verifyBtnText}>{t('verify')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 32, textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
  },
  pasteBtn: { padding: 4 },
  charCount: { fontSize: 13, marginTop: 8, marginBottom: 24, alignSelf: 'flex-end' },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    width: '100%',
  },
  verifyBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
