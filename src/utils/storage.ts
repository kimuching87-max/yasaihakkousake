import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export interface Recipe {
  id: string;
  title: string;
  imageUri: string | null;
  vegetableTags: string[];
  fermentedTags: string[];
  recipeUrl: string;
  ingredients: string;
  instructions: string;
  sakeInfo: {
    labelImageUri: string | null;
    brand: string;
    brewery: string;
    pairingNotes: string;
  };
  createdAt: string;
}

const RECIPES_KEY = '@yasaihakkousake_recipes';
const API_KEY_KEY = '@yasaihakkousake_api_key';

export const saveImagePermanently = async (tempUri: string | null): Promise<string | null> => {
  if (!tempUri) return null;
  
  // 既にアプリのドキュメントディレクトリ内にある場合はコピー不要
  const docDir = (FileSystem as any).documentDirectory;
  if (docDir && tempUri.startsWith(docDir)) {
    return tempUri;
  }

  try {
    const filename = tempUri.split('/').pop() || `image_${Date.now()}.jpg`;
    const newPath = `${docDir}${Date.now()}_${filename}`;
    await FileSystem.copyAsync({
      from: tempUri,
      to: newPath,
    });
    return newPath;
  } catch (error) {
    console.error('Failed to save image permanently:', error);
    return tempUri; // エラー時は一時URIをフォールバックとして返す
  }
};

export const getRecipes = async (): Promise<Recipe[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(RECIPES_KEY);
    return jsonValue ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Failed to load recipes:', error);
    return [];
  }
};

export const saveRecipes = async (recipes: Recipe[]): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(recipes);
    await AsyncStorage.setItem(RECIPES_KEY, jsonValue);
    return true;
  } catch (error) {
    console.error('Failed to save recipes:', error);
    return false;
  }
};

export const addRecipe = async (recipe: Recipe): Promise<boolean> => {
  try {
    const recipes = await getRecipes();
    // 画像を永続ディレクトリに保存
    const imageUri = await saveImagePermanently(recipe.imageUri);
    const labelImageUri = await saveImagePermanently(recipe.sakeInfo.labelImageUri);

    const newRecipe: Recipe = {
      ...recipe,
      imageUri,
      sakeInfo: {
        ...recipe.sakeInfo,
        labelImageUri,
      },
    };

    recipes.unshift(newRecipe); // 新しいものを先頭に追加
    return await saveRecipes(recipes);
  } catch (error) {
    console.error('Failed to add recipe:', error);
    return false;
  }
};

export const updateRecipe = async (updatedRecipe: Recipe): Promise<boolean> => {
  try {
    const recipes = await getRecipes();
    const index = recipes.findIndex(r => r.id === updatedRecipe.id);
    if (index === -1) return false;

    // 画像が変更されていれば永続ディレクトリに保存
    const originalRecipe = recipes[index];
    let imageUri = updatedRecipe.imageUri;
    if (updatedRecipe.imageUri !== originalRecipe.imageUri) {
      imageUri = await saveImagePermanently(updatedRecipe.imageUri);
    }
    
    let labelImageUri = updatedRecipe.sakeInfo.labelImageUri;
    if (updatedRecipe.sakeInfo.labelImageUri !== originalRecipe.sakeInfo.labelImageUri) {
      labelImageUri = await saveImagePermanently(updatedRecipe.sakeInfo.labelImageUri);
    }

    recipes[index] = {
      ...updatedRecipe,
      imageUri,
      sakeInfo: {
        ...updatedRecipe.sakeInfo,
        labelImageUri,
      },
    };

    return await saveRecipes(recipes);
  } catch (error) {
    console.error('Failed to update recipe:', error);
    return false;
  }
};

export const deleteRecipe = async (id: string): Promise<boolean> => {
  try {
    const recipes = await getRecipes();
    const filtered = recipes.filter(r => r.id !== id);
    return await saveRecipes(filtered);
  } catch (error) {
    console.error('Failed to delete recipe:', error);
    return false;
  }
};

export const getApiKey = async (): Promise<string> => {
  try {
    const key = await AsyncStorage.getItem(API_KEY_KEY);
    return key || '';
  } catch (error) {
    console.error('Failed to get API key:', error);
    return '';
  }
};

export const saveApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(API_KEY_KEY, apiKey);
    return true;
  } catch (error) {
    console.error('Failed to save API key:', error);
    return false;
  }
};
