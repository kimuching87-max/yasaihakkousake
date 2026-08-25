import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  useColorScheme,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import { getRecipes, deleteRecipe, Recipe } from '../../utils/storage';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    const recipes = await getRecipes();
    const found = recipes.find(r => r.id === id);
    if (found) {
      setRecipe(found);
    } else {
      Alert.alert('エラー', 'レシピが見つかりませんでした。', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '確認',
      'このレシピを削除してもよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteRecipe(id as string);
            if (success) {
              Alert.alert('削除完了', 'レシピを削除しました。');
              router.replace('/');
            } else {
              Alert.alert('エラー', '削除に失敗しました。');
            }
          },
        },
      ]
    );
  };

  const handleOpenUrl = () => {
    if (!recipe?.recipeUrl) return;
    
    // プロトコルの確認
    let targetUrl = recipe.recipeUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    Linking.canOpenURL(targetUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(targetUrl);
        } else {
          Alert.alert('エラー', 'このURLを開くことができませんでした。');
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  const handleShare = async () => {
    if (!recipe) return;

    try {
      let message = `🥬 野菜発酵酒ペアリングレシピ: ${recipe.title}\n`;
      if (recipe.ingredients) {
        message += `\n【材料】\n${recipe.ingredients}\n`;
      }
      if (recipe.recipeUrl) {
        message += `\n【参考レシピURL】\n${recipe.recipeUrl}\n`;
      }

      await Share.share({
        message: message,
        title: recipe.title,
      });
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  if (!recipe) return null;

  return (
    <ScrollView style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}>
      <Stack.Screen
        options={{
          title: recipe.title || 'レシピ詳細',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.headerShareButton}
              >
                <Text style={styles.headerShareText}>共有</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/recipe/edit?id=${recipe.id}`)}
                style={styles.headerEditButton}
              >
                <Text style={styles.headerEditText}>編集</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* 料理写真 */}
      {recipe.imageUri ? (
        <Image source={{ uri: recipe.imageUri }} style={styles.heroImage} />
      ) : (
        <View style={[styles.heroPlaceholder, isDark ? styles.placeholderDark : styles.placeholderLight]}>
          <Text style={styles.placeholderText}>🥬 料理写真未登録</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* レシピタイトル */}
        <Text style={[styles.title, isDark ? styles.textDark : styles.textLight]}>
          {recipe.title}
        </Text>

        {/* タグ表示 */}
        <View style={styles.tagsContainer}>
          {recipe.vegetableTags.map((tag, i) => (
            <View key={`veg-${i}`} style={styles.tagVegChip}>
              <Text style={styles.tagVegText}>🥬 {tag}</Text>
            </View>
          ))}
          {recipe.fermentedTags.map((tag, i) => (
            <View key={`ferm-${i}`} style={styles.tagFermChip}>
              <Text style={styles.tagFermText}>🏺 {tag}</Text>
            </View>
          ))}
        </View>

        {/* 他サイトレシピURLへの遷移ボタン */}
        {recipe.recipeUrl ? (
          <TouchableOpacity style={styles.urlButton} onPress={handleOpenUrl}>
            <Text style={styles.urlButtonText}>🔗 参考レシピサイトを開く</Text>
          </TouchableOpacity>
        ) : null}

        {/* 材料と手順 */}
        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
            材料
          </Text>
          <Text style={[styles.bodyText, isDark ? styles.subtextDark : styles.subtextLight]}>
            {recipe.ingredients || '登録されていません。'}
          </Text>
        </View>

        <View style={[styles.section, isDark ? styles.sectionDark : styles.sectionLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
            作り方
          </Text>
          <Text style={[styles.bodyText, isDark ? styles.subtextDark : styles.subtextLight]}>
            {recipe.instructions || '登録されていません。'}
          </Text>
        </View>

        {/* 日本酒ペアリングメモ */}
        <View style={[styles.sakeSection, isDark ? styles.sakeSectionDark : styles.sakeSectionLight]}>
          <View style={styles.sakeHeader}>
            <Text style={styles.sakeTitle}>🍶 日本酒ペアリングメモ</Text>
          </View>
          
          <View style={styles.sakeContent}>
            {recipe.sakeInfo.labelImageUri ? (
              <Image source={{ uri: recipe.sakeInfo.labelImageUri }} style={styles.sakeImage} />
            ) : null}
            
            <View style={styles.sakeInfoText}>
              <Text style={[styles.sakeBrand, isDark ? styles.textDark : styles.textLight]}>
                銘柄: {recipe.sakeInfo.brand || '未登録'}
              </Text>
              <Text style={[styles.sakeBrewery, isDark ? styles.subtextDark : styles.subtextLight]}>
                蔵元: {recipe.sakeInfo.brewery || '未登録'}
              </Text>
            </View>
          </View>

          <View style={styles.sakeNotesContainer}>
            <Text style={[styles.sakeNotesTitle, isDark ? styles.textDark : styles.textLight]}>
              ペアリング・味わいの特徴:
            </Text>
            <Text style={[styles.sakeNotesText, isDark ? styles.subtextDark : styles.subtextLight]}>
              {recipe.sakeInfo.pairingNotes || 'メモはありません。'}
            </Text>
          </View>
        </View>

        {/* 削除ボタン */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>このレシピを削除する</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    color: '#4b5563',
  },
  subtextDark: {
    color: '#9ca3af',
  },
  headerShareButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerShareText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  headerEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerEditText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: 'bold',
  },
  heroImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: 180,
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
    fontSize: 14,
    color: '#9ca3af',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagVegChip: {
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  tagVegText: {
    color: '#137333',
    fontSize: 12,
    fontWeight: '600',
  },
  tagFermChip: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  tagFermText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '600',
  },
  urlButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  urlButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  sectionDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.2)',
    paddingBottom: 4,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  sakeSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  sakeSectionLight: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  sakeSectionDark: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  sakeHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.2)',
    paddingBottom: 6,
    marginBottom: 12,
  },
  sakeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  sakeContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  sakeImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'cover',
  },
  sakeInfoText: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  sakeBrand: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sakeBrewery: {
    fontSize: 14,
  },
  sakeNotesContainer: {
    marginTop: 4,
  },
  sakeNotesTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  sakeNotesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
