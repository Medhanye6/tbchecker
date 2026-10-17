import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../lib/theme';
import { useLanguage } from '../../lib/useLanguage';
import {
  getHistory,
  searchHistory,
  clearHistory,
  deleteHistoryItem,
  HistoryItem,
} from '../../lib/database';

export default function HistoryScreen() {
  const scheme = useColorScheme();
  const colors = COLORS[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const data = query.trim()
      ? await searchHistory(query.trim())
      : await getHistory();
    setItems(data);
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleClear = () => {
    Alert.alert(t('clearHistory'), t('clearHistoryConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setItems([]);
        },
      },
    ]);
  };

  const handleDelete = (id: number) => {
    Alert.alert(t('delete'), t('clearHistoryConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteHistoryItem(id);
          loadHistory();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const isVerified = item.status === 'verified';
    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          router.push({
            pathname: '/result',
            params: {
              txid: item.txid,
              success: isVerified ? '1' : '0',
              data: item.raw_json ?? '',
            },
          });
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.itemIcon, {
          backgroundColor: isVerified ? colors.successLight : colors.dangerLight,
        }]}>
          <Ionicons
            name={isVerified ? 'checkmark-circle' : 'close-circle'}
            size={24}
            color={isVerified ? colors.success : colors.danger}
          />
        </View>

        <View style={styles.itemContent}>
          <Text style={[styles.itemTxid, { color: colors.text }]}>{item.txid}</Text>
          <Text style={[styles.itemDate, { color: colors.textSecondary }]}>
            {item.date || item.created_at}
          </Text>
          {item.amount && (
            <Text style={[styles.itemAmount, { color: colors.primary }]}>
              {item.amount}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('history')}</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Text style={[styles.clearText, { color: colors.danger }]}>{t('clearHistory')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('searchHistory')}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={loadHistory}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noHistory')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {t('noHistoryDesc')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  clearText: { fontSize: 14, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  list: { padding: 20, paddingTop: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: { flex: 1 },
  itemTxid: { fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  itemDate: { fontSize: 12, marginTop: 2 },
  itemAmount: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  deleteBtn: { padding: 8 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptyDesc: { fontSize: 14, marginTop: 4 },
});
