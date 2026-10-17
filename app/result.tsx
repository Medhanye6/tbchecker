import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';
import { useLanguage } from '../lib/useLanguage';
import { TelebirrReceipt, verifyTelebirr } from '../lib/api';

function Row({ label, value, colors }: { label: string; value: string; colors: any }) {
  if (!value) return null;
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function ResultScreen() {
  const scheme = useColorScheme();
  const colors = COLORS[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{
    txid: string;
    success: string;
    data: string;
  }>();

  const txid = params.txid ?? '';
  const isSuccess = params.success === '1';
  const receipt: TelebirrReceipt | null = useMemo(() => {
    if (!params.data) return null;
    try {
      return JSON.parse(params.data);
    } catch {
      return null;
    }
  }, [params.data]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(txid);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShare = async () => {
    let text = `Telebirr TXID: ${txid}\n`;
    if (receipt) {
      text += `Status: ${receipt.transactionStatus}\n`;
      text += `Payer: ${receipt.payerName}\n`;
      text += `Receiver: ${receipt.creditedPartyName}\n`;
      text += `Amount: ${receipt.settledAmount}\n`;
      text += `Date: ${receipt.paymentDate}\n`;
    }
    await Share.share({ message: text });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* Status badge */}
      <View style={styles.statusSection}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isSuccess ? colors.successLight : colors.dangerLight },
          ]}
        >
          <Ionicons
            name={isSuccess ? 'checkmark-circle' : 'close-circle'}
            size={50}
            color={isSuccess ? colors.success : colors.danger}
          />
        </View>
        <Text style={[styles.statusText, { color: isSuccess ? colors.success : colors.danger }]}>
          {isSuccess ? t('verified') : t('notFound')}
        </Text>
        {!isSuccess && (
          <Text style={[styles.notFoundDesc, { color: colors.textSecondary }]}>
            {t('notFoundDesc')}
          </Text>
        )}
      </View>

      {/* TXID Card */}
      <View style={[styles.txidCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.txidLabel, { color: colors.textSecondary }]}>{t('enterTxid')}</Text>
        <View style={styles.txidRow}>
          <Text style={[styles.txidValue, { color: colors.text }]}>{txid}</Text>
          <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
            <Ionicons name="copy-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Receipt details */}
      {isSuccess && receipt && (
        <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('result')}</Text>

          <Row label={t('payerName')} value={receipt.payerName} colors={colors} />
          <Row label={t('payerAccount')} value={receipt.payerTelebirrNo} colors={colors} />
          <Row label={t('receiverName')} value={receipt.creditedPartyName} colors={colors} />
          <Row label={t('receiverAccount')} value={receipt.creditedPartyAccountNo} colors={colors} />

          {/* Amount highlight */}
          <View style={[styles.amountBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>{t('amount')}</Text>
            <Text style={[styles.amountValue, { color: colors.primary }]}>
              {receipt.settledAmount}
            </Text>
          </View>

          <Row label={t('serviceFee')} value={receipt.serviceFee} colors={colors} />
          <Row label={t('vat')} value={receipt.serviceFeeVAT} colors={colors} />
          <Row label={t('totalPaid')} value={receipt.totalPaidAmount} colors={colors} />
          <Row label={t('status')} value={receipt.transactionStatus} colors={colors} />
          <Row label={t('date')} value={receipt.paymentDate} colors={colors} />
          <Row label={t('bank')} value={receipt.bankName} colors={colors} />
          <Row label={t('note')} value={receipt.customerNote} colors={colors} />
          <Row label={t('receiptNo')} value={receipt.receiptNo} colors={colors} />
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-social" size={18} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>{t('share')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  statusSection: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  statusBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusText: { fontSize: 22, fontWeight: '800' },
  notFoundDesc: { fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  txidCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  txidLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  txidRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txidValue: { fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  copyBtn: { padding: 6 },
  detailsCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 14, flex: 1 },
  rowValue: { fontSize: 14, fontWeight: '600', flex: 1.4, textAlign: 'right' },
  amountBox: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  amountLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  amountValue: { fontSize: 26, fontWeight: '800' },
  actions: { gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
