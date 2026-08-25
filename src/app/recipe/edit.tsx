import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getRecipes, addRecipe, updateRecipe, Recipe } from '../../utils/storage';
import { analyzeDishImage, analyzeSakeLabelImage } from '../../utils/gemini';

export default function RecipeEditScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const isEditMode = !!id;

  // フォーム状態
  const [title, setTitle] = useState('');
  const [dishImage, setDishImage] = useState<string | null>(null);
  const [vegTagsText, setVegTagsText] = useState('');
  const [fermTagsText, setFermTagsText] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');

  // 日本酒ペアリング状態
  const [sakeImage, setSakeImage] = useState<string | null>(null);
  const [sakeBrand, setSakeBrand] = useState('');
  const [sakeBrewery, setSakeBrewery] = useState('');
  const [sakeNotes, setSakeNotes] = useState('');

  // ローディング状態
  const [loading, setLoading] = useState(false);
  const [aiAnalyzingDish, setAiAnalyzingDish] = useState(false);
  const [aiAnalyzingSake, setAiAnalyzingSake] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadRecipeData();
    }
  }, [id]);

  const loadRecipeData = async () => {
    setLoading(true);
    const recipes = await getRecipes();
    const recipe = recipes.find(r => r.id === id);
    if (recipe) {
      setTitle(recipe.title);
      setDishImage(recipe.imageUri);
      setVegTagsText(recipe.vegetableTags.join(', '));
      setFermTagsText(recipe.fermentedTags.join(', '));
      setRecipeUrl(recipe.recipeUrl);
      setIngredients(recipe.ingredients);
      setInstructions(recipe.instructions);
      
      setSakeImage(recipe.sakeInfo.labelImageUri);
      setSakeBrand(recipe.sakeInfo.brand);
      setSakeBrewery(recipe.sakeInfo.brewery);
      setSakeNotes(recipe.sakeInfo.pairingNotes);
    } else {
      Alert.alert('エラー', '編集対象のレシピが見つかりませんでした。');
      router.back();
    }
    setLoading(false);
  };

  const pickImage = async (type: 'dish' | 'sake', useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('権限エラー', 'カメラの使用許可が必要です。');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('権限エラー', '写真ライブラリへのアクセス許可が必要です。');
          return;
        }
      }

      const pickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        if (type === 'dish') {
          setDishImage(selectedUri);
        } else {
          setSakeImage(selectedUri);
        }
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('エラー', '画像の取得中にエラーが発生しました。');
    }
  };

  const handleSelectImage = (type: 'dish' | 'sake') => {
    Alert.alert(
      '画像の選択',
      '画像の取得方法を選択してください。',
      [
        { text: 'カメラで撮影する', onPress: () => pickImage(type, true) },
        { text: 'ライブラリから選ぶ', onPress: () => pickImage(type, false) },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  };

  // Geminiで料理写真を解析
  const handleAnalyzeDish = async () => {
    if (!dishImage) {
      Alert.alert('案内', '料理写真を選択または撮影してから実行してください。');
      return;
    }

    setAiAnalyzingDish(true);
    try {
      const result = await analyzeDishImage(dishImage);
      
      if (result.title) setTitle(result.title);
      if (result.ingredients) setIngredients(result.ingredients);
      if (result.instructions) setInstructions(result.instructions);
      
      if (result.vegetableTags && result.vegetableTags.length > 0) {
        // 既存のタグとマージするか、上書きするか。今回は上書き or セット
        setVegTagsText(result.vegetableTags.join(', '));
      }
      if (result.fermentedTags && result.fermentedTags.length > 0) {
        setFermTagsText(result.fermentedTags.join(', '));
      }

      Alert.alert('AI推測完了', '写真から材料、作り方、タグを推測して自動入力しました。内容を確認し、適宜修正してください。');
    } catch (error: any) {
      console.error('AI analysis failed:', error);
      Alert.alert('解析失敗', error.message || 'Geminiでの画像解析に失敗しました。APIキーが正しく設定されているか確認してください。');
    } finally {
      setAiAnalyzingDish(false);
    }
  };

  // Geminiで日本酒ボトルラベルを解析
  const handleAnalyzeSake = async () => {
    if (!sakeImage) {
      Alert.alert('案内', '日本酒のボトルラベル写真を選択または撮影してから実行してください。');
      return;
    }

    setAiAnalyzingSake(true);
    try {
      const result = await analyzeSakeLabelImage(sakeImage);

      if (result.brand) setSakeBrand(result.brand);
      if (result.brewery) setSakeBrewery(result.brewery);
      if (result.characteristics) setSakeNotes(result.characteristics);

      Alert.alert('AI解析完了', 'ラベルから日本酒の銘柄、蔵元、味わいの特徴を読み取りました。');
    } catch (error: any) {
      console.error('AI sake analysis failed:', error);
      Alert.alert('解析失敗', error.message || 'Geminiでのラベル解析に失敗しました。APIキーが正しく設定されているか確認してください。');
    } finally {
      setAiAnalyzingSake(false);
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('入力エラー', '料理名は必須入力です。');
      return;
    }

    // カンマ区切りのテキストからタグ配列を作成（空要素を排除）
    const vegetableTags = vegTagsText
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => t !== '');
    const fermentedTags = fermTagsText
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => t !== '');


    const recipeData: Recipe = {
      id: isEditMode ? (id as string) : Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      imageUri: dishImage,
      vegetableTags,
      fermentedTags,
      recipeUrl: recipeUrl.trim(),
      ingredients: ingredients.trim(),
      instructions: instructions.trim(),
      sakeInfo: {
        labelImageUri: sakeImage,
        brand: sakeBrand.trim(),
        brewery: sakeBrewery.trim(),
        pairingNotes: sakeNotes.trim(),
      },
      createdAt: isEditMode ? new Date().toISOString() : new Date().toISOString(), // 編集時は元の作成日を引き継ぐのが理想だが簡易的に現在時刻
    };

    setLoading(true);
    let success = false;
    if (isEditMode) {
      success = await updateRecipe(recipeData);
    } else {
      success = await addRecipe(recipeData);
    }
    setLoading(false);

    if (success) {
      Alert.alert('保存完了', 'レシピを正常に保存しました。');
      // ホームに戻る
      router.replace('/');
    } else {
      Alert.alert('エラー', '保存に失敗しました。');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, isDark ? styles.bgDark : styles.bgLight, styles.center]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <Stack.Screen
        options={{
          title: isEditMode ? 'レシピの編集' : '新しいペアリング',
        }}
      />
      <ScrollView style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}>
        <View style={styles.formContainer}>
          
          {/* Section 1: 料理の基本情報 */}
          <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
            1. 料理の情報
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>料理名 *</Text>
            <TextInput
              style={[
                styles.input,
                isDark ? styles.inputDark : styles.inputLight,
                isDark ? styles.textDark : styles.textLight,
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="例：ナスの塩麹炒め"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
          </View>

          {/* 料理写真の登録とGemini解析 */}
          <View style={styles.imageUploadSection}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>料理写真</Text>
            <View style={styles.imageRow}>
              <TouchableOpacity
                style={[styles.imagePickerBox, isDark ? styles.pickerBoxDark : styles.pickerBoxLight]}
                onPress={() => handleSelectImage('dish')}
              >
                {dishImage ? (
                  <Image source={{ uri: dishImage }} style={styles.previewImage} />
                ) : (
                  <Text style={[styles.pickerBoxText, isDark ? styles.subtextDark : styles.subtextLight]}>
                    📷 写真を選択・撮影
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.aiButtonColumn}>
                <TouchableOpacity
                  style={[styles.aiButton, !dishImage && styles.buttonDisabled]}
                  onPress={handleAnalyzeDish}
                  disabled={aiAnalyzingDish || !dishImage}
                >
                  {aiAnalyzingDish ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.aiButtonText}>🪄 Geminiで解析する</Text>
                  )}
                </TouchableOpacity>
                <Text style={[styles.aiButtonHint, isDark ? styles.subtextDark : styles.subtextLight]}>
                  写真から材料、手順、タグを自動推測します
                </Text>
              </View>
            </View>
          </View>

          {/* タグ情報 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>野菜タグ (カンマ区切り)</Text>
            <TextInput
              style={[
                styles.input,
                isDark ? styles.inputDark : styles.inputLight,
                isDark ? styles.textDark : styles.textLight,
              ]}
              value={vegTagsText}
              onChangeText={setVegTagsText}
              placeholder="例：ナス, トマト, 大葉"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>発酵調味料タグ (カンマ区切り)</Text>
            <TextInput
              style={[
                styles.input,
                isDark ? styles.inputDark : styles.inputLight,
                isDark ? styles.textDark : styles.textLight,
              ]}
              value={fermTagsText}
              onChangeText={setFermTagsText}
              placeholder="例：塩麹, 味噌, 醤油麹"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
          </View>

          {/* 他サイトURL */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>レシピURL</Text>
            <TextInput
              style={[
                styles.input,
                isDark ? styles.inputDark : styles.inputLight,
                isDark ? styles.textDark : styles.textLight,
              ]}
              value={recipeUrl}
              onChangeText={setRecipeUrl}
              placeholder="https://example.com/recipe"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* 材料と手順 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>材料</Text>
            <TextInput
              style={[
                styles.textArea,
                isDark ? styles.inputDark : styles.inputLight,
                isDark ? styles.textDark : styles.textLight,
              ]}
              value={ingredients}
              onChangeText={setIngredients}
              placeholder="材料名と分量を入力してください"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              multiline={true}
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>作り方</Text>
            <TextInput
              style={[
                styles.textArea,
                isDark ? styles.inputDark : styles.inputLight,
                isDark ? styles.textDark : styles.textLight,
              ]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="調理手順を入力してください"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              multiline={true}
              numberOfLines={5}
            />
          </View>

          <View style={styles.divider} />

          {/* Section 2: 日本酒ペアリング情報 */}
          <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
            2. 日本酒ペアリングの情報
          </Text>

          {/* ボトルラベル写真の登録とGemini解析 */}
          <View style={styles.imageUploadSection}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>ボトルラベル写真</Text>
            <View style={styles.imageRow}>
              <TouchableOpacity
                style={[styles.imagePickerBox, isDark ? styles.pickerBoxDark : styles.pickerBoxLight]}
                onPress={() => handleSelectImage('sake')}
              >
                {sakeImage ? (
                  <Image source={{ uri: sakeImage }} style={styles.previewImage} />
                ) : (
                  <Text style={[styles.pickerBoxText, isDark ? styles.subtextDark : styles.subtextLight]}>
                    🍶 ラベルを選択・撮影
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.aiButtonColumn}>
                <TouchableOpacity
                  style={[styles.aiButton, !sakeImage && styles.buttonDisabled]}
                  onPress={handleAnalyzeSake}
                  disabled={aiAnalyzingSake || !sakeImage}
                >
                  {aiAnalyzingSake ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.aiButtonText}>🪄 AIでラベルを読取る</Text>
                  )}
                </TouchableOpacity>
                <Text style={[styles.aiButtonHint, isDark ? styles.subtextDark : styles.subtextLight]}>
                  ラベルから銘柄や蔵元、味わいの特徴を自動で読み取ります
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>銘柄</Text>
            <TextInput
              style={[
                styles.input,
                isDark ? styles.inputDark : styles.inputLight,
                isDark ? styles.textDark : styles.textLight,
              ]}
              value={sakeBrand}
              onChangeText={setSakeBrand}
              placeholder="例：純米大吟醸 八海山"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>蔵元</Text>
            <TextInput
              style={[
                styles.input,
                isDark ? styles.inputDark : styles.inputLight,
                isDark ? styles.textDark : styles.textLight,
              ]}
              value={sakeBrewery}
              onChangeText={setSakeBrewery}
              placeholder="例：八海醸造株式会社"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>ペアリング・味わいメモ</Text>
            <TextInput
              style={[
                styles.textArea,
                isDark ? styles.inputDark : styles.inputLight,
                isDark ? styles.textDark : styles.textLight,
              ]}
              value={sakeNotes}
              onChangeText={setSakeNotes}
              placeholder="味わいや、この料理と合わせた感想などを入力してください"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              multiline={true}
              numberOfLines={4}
            />
          </View>

          {/* 保存ボタン */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>ペアリングを保存する</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
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
  formContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#10b981',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  inputLight: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  inputDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  textArea: {
    minHeight: 88,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  imageUploadSection: {
    marginBottom: 20,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imagePickerBox: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pickerBoxLight: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  pickerBoxDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  pickerBoxText: {
    fontSize: 11,
    textAlign: 'center',
    padding: 4,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  aiButtonColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  aiButton: {
    backgroundColor: '#10b981',
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  aiButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  aiButtonHint: {
    fontSize: 10,
    lineHeight: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    marginVertical: 20,
  },
  saveButton: {
    backgroundColor: '#10b981',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
