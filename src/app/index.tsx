import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecipes, Recipe } from '../utils/storage';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVegTag, setSelectedVegTag] = useState<string | null>(null);
  const [selectedFermTag, setSelectedFermTag] = useState<string | null>(null);

  // 画面フォーカス時にレシピデータを再読込
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const load = async () => {
        const data = await getRecipes();
        if (isActive) {
          setRecipes(data);
        }
      };
      load();
      return () => {
        isActive = false;
      };
    }, [])
  );

  // 全レシピからタグを抽出（重複排除）
  const allVegTags = Array.from(
    new Set(recipes.flatMap(r => r.vegetableTags || []).filter(t => t.trim() !== ''))
  );
  const allFermTags = Array.from(
    new Set(recipes.flatMap(r => r.fermentedTags || []).filter(t => t.trim() !== ''))
  );

  // 検索とタグによるフィルタリング
  const filteredRecipes = recipes.filter(recipe => {
    // フリーワード検索 (タイトル、材料、日本酒銘柄)
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      query === '' ||
      recipe.title.toLowerCase().includes(query) ||
      recipe.ingredients.toLowerCase().includes(query) ||
      recipe.sakeInfo.brand.toLowerCase().includes(query);

    // 野菜タグフィルタ
    const matchesVeg = !selectedVegTag || recipe.vegetableTags.includes(selectedVegTag);

    // 発酵調味料タグフィルタ
    const matchesFerm = !selectedFermTag || recipe.fermentedTags.includes(selectedFermTag);

    return matchesQuery && matchesVeg && matchesFerm;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedVegTag(null);
    setSelectedFermTag(null);
  };

  const renderRecipeItem = ({ item }: { item: Recipe }) => {
    return (
      <TouchableOpacity
        style={[styles.recipeCard, isDark ? styles.cardDark : styles.cardLight]}
        onPress={() => router.push(`/recipe/${item.id}`)}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.recipeImage} />
        ) : (
          <View style={[styles.imagePlaceholder, isDark ? styles.placeholderDark : styles.placeholderLight]}>
            <Text style={styles.placeholderText}>🥬 料理写真なし</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <Text style={[styles.recipeTitle, isDark ? styles.textDark : styles.textLight]} numberOfLines={1}>
            {item.title || '無題のレシピ'}
          </Text>

          {/* タグ表示 */}
          <View style={styles.tagsContainer}>
            {item.vegetableTags.slice(0, 3).map((tag, i) => (
              <View key={`veg-${i}`} style={styles.tagVegChip}>
                <Text style={styles.tagVegText}>🥬 {tag}</Text>
              </View>
            ))}
            {item.fermentedTags.slice(0, 3).map((tag, i) => (
              <View key={`ferm-${i}`} style={styles.tagFermChip}>
                <Text style={styles.tagFermText}>🏺 {tag}</Text>
              </View>
            ))}
          </View>

          {/* ペアリング日本酒 */}
          {item.sakeInfo.brand ? (
            <View style={styles.sakePairingContainer}>
              <Text style={styles.sakePairingLabel}>ペアリング酒:</Text>
              <Text style={[styles.sakePairingValue, isDark ? styles.textDark : styles.textLight]} numberOfLines={1}>
                🍶 {item.sakeInfo.brand} {item.sakeInfo.brewery ? `(${item.sakeInfo.brewery})` : ''}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noSakeText, isDark ? styles.subtextDark : styles.subtextLight]}>
              ペアリング酒の記録なし
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark ? styles.bgDark : styles.bgLight]} edges={['bottom', 'left', 'right']}>
      {/* 検索・設定バー */}
      <View style={styles.searchHeader}>
        <TextInput
          style={[
            styles.searchInput,
            isDark ? styles.inputDark : styles.inputLight,
            isDark ? styles.textDark : styles.textLight,
          ]}
          placeholder="料理名、材料、日本酒で検索..."
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.settingsButton, isDark ? styles.btnDark : styles.btnLight]}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* タグフィルターエリア */}
      <View style={styles.filterSection}>
        {/* 野菜タグ */}
        {allVegTags.length > 0 && (
          <View style={styles.tagRow}>
            <Text style={[styles.filterLabel, isDark ? styles.textDark : styles.textLight]}>野菜:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
              {allVegTags.map((tag) => {
                const isSelected = selectedVegTag === tag;
                return (
                  <TouchableOpacity
                    key={`filter-veg-${tag}`}
                    style={[
                      styles.filterChip,
                      isSelected ? styles.chipSelectedVeg : (isDark ? styles.chipDark : styles.chipLight),
                    ]}
                    onPress={() => setSelectedVegTag(isSelected ? null : tag)}
                  >
                    <Text style={[styles.filterChipText, isSelected ? styles.chipTextSelected : (isDark ? styles.textDark : styles.textLight)]}>
                      🥬 {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 発酵調味料タグ */}
        {allFermTags.length > 0 && (
          <View style={styles.tagRow}>
            <Text style={[styles.filterLabel, isDark ? styles.textDark : styles.textLight]}>発酵:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
              {allFermTags.map((tag) => {
                const isSelected = selectedFermTag === tag;
                return (
                  <TouchableOpacity
                    key={`filter-ferm-${tag}`}
                    style={[
                      styles.filterChip,
                      isSelected ? styles.chipSelectedFerm : (isDark ? styles.chipDark : styles.chipLight),
                    ]}
                    onPress={() => setSelectedFermTag(isSelected ? null : tag)}
                  >
                    <Text style={[styles.filterChipText, isSelected ? styles.chipTextSelected : (isDark ? styles.textDark : styles.textLight)]}>
                      🏺 {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* フィルタークリア */}
        {(selectedVegTag || selectedFermTag || searchQuery !== '') && (
          <TouchableOpacity style={styles.clearFilterButton} onPress={clearFilters}>
            <Text style={styles.clearFilterText}>フィルターをクリア</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* レシピリスト */}
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipeItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, isDark ? styles.textDark : styles.textLight]}>
              レシピが見つかりませんでした。
            </Text>
            <Text style={[styles.emptySubtext, isDark ? styles.subtextDark : styles.subtextLight]}>
              右下の「＋」ボタンから、お気に入りのペアリングを記録しましょう！
            </Text>
          </View>
        }
      />

      {/* 新規登録ボタン (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/recipe/edit')}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: '#f3f4f6',
  },
  bgDark: {
    backgroundColor: '#111827',
  },
  textLight: {
    color: '#1f2937',
  },
  textDark: {
    color: '#f3f4f6',
  },
  subtextLight: {
    color: '#6b7280',
  },
  subtextDark: {
    color: '#9ca3af',
  },
  searchHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  inputLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  inputDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  btnLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  btnDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  settingsIcon: {
    fontSize: 20,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    width: 40,
  },
  tagScroll: {
    paddingRight: 16,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  chipDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  chipSelectedVeg: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  chipSelectedFerm: {
    backgroundColor: '#d97706',
    borderColor: '#d97706',
  },
  filterChipText: {
    fontSize: 12,
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  clearFilterButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  clearFilterText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 88, // FAB分のマージン
  },
  recipeCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  cardDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  recipeImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLight: {
    backgroundColor: '#e5e7eb',
  },
  placeholderDark: {
    backgroundColor: '#374151',
  },
  placeholderText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 4,
  },
  tagVegChip: {
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagVegText: {
    color: '#137333',
    fontSize: 10,
    fontWeight: '600',
  },
  tagFermChip: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagFermText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '600',
  },
  sakePairingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sakePairingLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  sakePairingValue: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  noSakeText: {
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#10b981',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
});
