import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../lib/theme';
import { useLanguage } from '../../lib/useLanguage';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = COLORS[scheme === 'dark' ? 'dark' : 'light'];
  const { lang, setLang, t } = useLanguage();
  const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string) || 'https://tbchecker-appi.vercel.app';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings')}</Text>

        {/* Language */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="language" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('language')}</Text>
          </View>
          <View style={styles.optionsRow}>
            {(['en', 'am'] as const).map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: lang === l ? colors.primary : colors.input,
                    borderColor: lang === l ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setLang(l)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: lang === l ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {l === 'en' ? t('english') : t('amharic')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('about')}</Text>
          </View>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            {t('aboutText')}
          </Text>
          <View style={[styles.apiRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.apiLabel, { color: colors.textSecondary }]}>{t('apiUrl')}</Text>
            <Text style={[styles.apiValue, { color: colors.text }]} numberOfLines={1}>
              {apiUrl}
            </Text>
          </View>
        </View>

        {/* Version */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="apps" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Version</Text>
          </View>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', marginBottom: 24 },
  section: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  optionsRow: { flexDirection: 'row', gap: 10 },
  optionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { fontSize: 14, fontWeight: '600' },
  aboutText: { fontSize: 14, lineHeight: 21 },
  apiRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  apiLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  apiValue: { fontSize: 13, fontWeight: '500' },
});
