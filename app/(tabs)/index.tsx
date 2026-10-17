import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../lib/theme';
import { useLanguage } from '../../lib/useLanguage';
import { ocrImage, verifyTelebirr, isValidTxid } from '../../lib/api';
import { saveToHistory } from '../../lib/database';
import { setLastOcrDebug } from '../../lib/ocrDebug';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = COLORS[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const processImage = useCallback(
    async (base64: string, uri: string) => {
      setPreview(uri);
      setLoading(true);
      setStatusText(t('scanning'));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        setStatusText(t('extracting'));
        const ocrResult = await ocrImage(base64);
        setLastOcrDebug({ ...ocrResult, imageUri: uri, at: Date.now() });

        let txid = ocrResult.txid?.toUpperCase().trim() ?? '';

        if (!txid || !isValidTxid(txid)) {
          setLoading(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const guess = ocrResult.candidates?.[0] ?? '';
          Alert.alert(
            t('txidNotFound'),
            t('txidNotFoundDesc'),
            [
              { text: t('cancel'), style: 'cancel' },
              { text: t('viewOcrResult'), onPress: () => router.push('/debug') },
              {
                text: t('manualEntry'),
                onPress: () =>
                  router.push({
                    pathname: '/verify',
                    params: { initialTxid: guess, fromOcr: '1' },
                  }),
              },
            ]
          );
          return;
        }

        setStatusText(t('verifying'));
        const verifyResult = await verifyTelebirr(txid);

        await saveToHistory(
          txid,
          verifyResult.success ? 'verified' : 'not_found',
          verifyResult.data
        );

        setLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
          pathname: '/result',
          params: {
            txid,
            success: verifyResult.success ? '1' : '0',
            data: verifyResult.data ? JSON.stringify(verifyResult.data) : '',
          },
        });
      } catch {
        setLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('error'), t('networkError'));
      }
    },
    [t, router]
  );

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), 'Permission denied');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.9,
      base64: true,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    let base64 = asset.base64;
    if (!base64) {
      const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      base64 = fileContent;
    }
    await processImage(base64!, asset.uri);
  }, [processImage, t]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), 'Permission denied');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      base64: true,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    let base64 = asset.base64;
    if (!base64) {
      const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      base64 = fileContent;
    }
    await processImage(base64!, asset.uri);
  }, [processImage, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={[styles.logoBox, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>{t('appName')}</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            {t('tagline')}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={pickImage}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="image" size={28} color={colors.primary} />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{t('scanScreenshot')}</Text>
              <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>{t('scanScreenshotDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={takePhoto}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="camera" size={28} color={colors.accent} />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{t('takePhoto')}</Text>
              <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>{t('takePhotoDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/verify')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="keypad" size={28} color={colors.success} />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{t('manualEntry')}</Text>
              <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>{t('manualEntryDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {preview && (
              <Image source={{ uri: preview }} style={styles.previewImg} resizeMode="cover" />
            )}
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 12 }} />
            <Text style={[styles.loadingText, { color: colors.text }]}>{statusText}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 30, marginBottom: 40 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  tagline: { fontSize: 15 },
  actions: { gap: 14 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  actionDesc: { fontSize: 13 },
  loadingBox: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  previewImg: { width: 120, height: 120, borderRadius: 12 },
  loadingText: { marginTop: 12, fontSize: 15, fontWeight: '600' },
});
