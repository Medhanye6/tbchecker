import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';
import { useLanguage } from '../lib/useLanguage';
import { getLastOcrDebug } from '../lib/ocrDebug';

function Field({ label, value, colors }: { label: string; value: string; colors: any }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: colors.text }]} selectable>
        {value}
      </Text>
    </View>
  );
}

export default function DebugScreen() {
  const scheme = useColorScheme();
  const colors = COLORS[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useLanguage();
  const router = useRouter();
  const record = getLastOcrDebug();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!record?.rawText) return;
    await Clipboard.setStringAsync(record.rawText);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('ocrDebug')}</Text>
      </View>

      {!record ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noOcrData')}</Text>
        </View>
      ) : (
        <>
          {record.imageUri && (
            <Image source={{ uri: record.imageUri }} style={styles.preview} resizeMode="contain" />
          )}

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: record.txid ? colors.success : colors.danger },
                ]}
              />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {record.txid ? t('txidDetected') : t('txidNotFound')}
              </Text>
            </View>

            {record.error ? (
              <Field label="Error" value={record.error} colors={colors} />
            ) : null}
            <Field label={t('ocrDetectedTxid')} value={record.txid || '—'} colors={colors} />
            <Field
              label={t('ocrMatchedLabel')}
              value={record.matchedLabel || '—'}
              colors={colors}
            />
            <Field
              label={t('ocrCandidates')}
              value={record.candidates && record.candidates.length ? record.candidates.join(', ') : '—'}
              colors={colors}
            />
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {new Date(record.at).toLocaleString()}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.rawHeader}>
              <Text style={[styles.rawTitle, { color: colors.text }]}>{t('rawOcrText')}</Text>
              <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.rawText, { color: colors.text }]} selectable>
              {record.rawText && record.rawText.trim().length ? record.rawText : t('noTextFound')}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '800' },
  emptyBox: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  preview: { width: '100%', height: 220, borderRadius: 14, marginBottom: 16, backgroundColor: '#0006' },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontWeight: '700' },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
  fieldValue: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 4 },
  rawHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rawTitle: { fontSize: 15, fontWeight: '700' },
  copyBtn: { padding: 4 },
  rawText: { fontSize: 13, lineHeight: 19, fontFamily: 'monospace' },
});
