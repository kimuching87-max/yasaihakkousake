import * as FileSystem from 'expo-file-system';
import { getApiKey } from './storage';

interface GeminiRecipeResponse {
  title: string;
  ingredients: string;
  instructions: string;
  vegetableTags: string[];
  fermentedTags: string[];
}

interface GeminiSakeResponse {
  brand: string;
  brewery: string;
  characteristics: string;
}

const convertImageToBase64 = async (uri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    throw new Error('画像の読み込みに失敗しました。');
  }
};

const callGeminiApi = async (
  apiKey: string,
  prompt: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error Response:', errorText);
    throw new Error(`Gemini API リクエストが失敗しました: ${response.status}`);
  }

  const result = await response.json();
  
  try {
    const textResponse = result.candidates[0].content.parts[0].text;
    return textResponse;
  } catch (e) {
    console.error('Failed to parse Gemini response structure:', result);
    throw new Error('Geminiのレスポンス解析に失敗しました。');
  }
};

export const analyzeDishImage = async (imageUri: string): Promise<GeminiRecipeResponse> => {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('Gemini APIキーが設定されていません。設定画面からキーを入力してください。');
  }

  const base64 = await convertImageToBase64(imageUri);
  
  const prompt = `自家栽培の野菜や発酵調味料を使用した料理の写真です。この写真から、料理名、材料（分量を含む）、および調理手順を推測してください。また、主役となる野菜タグ（複数可、例：「トマト」「ナス」など）と発酵調味料タグ（複数可、例：「塩麹」「醤油麹」「味噌」など）も推測してください。回答は必ず日本語で、以下のJSONフォーマットに従って返してください。

JSONフォーマット:
{
  "title": "推測される料理名",
  "ingredients": "材料リスト（分量を含めて改行区切りのテキスト）",
  "instructions": "調理手順（番号付きで改行区切りのテキスト）",
  "vegetableTags": ["野菜タグ1", "野菜タグ2"],
  "fermentedTags": ["発酵調味料タグ1", "発酵調味料タグ2"]
}`;

  // 拡張子からMIMEタイプを判定
  let mimeType = 'image/jpeg';
  if (imageUri.toLowerCase().endsWith('.png')) {
    mimeType = 'image/png';
  } else if (imageUri.toLowerCase().endsWith('.webp')) {
    mimeType = 'image/webp';
  }

  const rawJson = await callGeminiApi(apiKey, prompt, base64, mimeType);
  
  try {
    const data = JSON.parse(rawJson) as GeminiRecipeResponse;
    return {
      title: data.title || '',
      ingredients: data.ingredients || '',
      instructions: data.instructions || '',
      vegetableTags: Array.isArray(data.vegetableTags) ? data.vegetableTags : [],
      fermentedTags: Array.isArray(data.fermentedTags) ? data.fermentedTags : [],
    };
  } catch (error) {
    console.error('Failed to parse recipe JSON from Gemini:', rawJson);
    throw new Error('Geminiから無効なフォーマットのデータを受信しました。');
  }
};

export const analyzeSakeLabelImage = async (imageUri: string): Promise<GeminiSakeResponse> => {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('Gemini APIキーが設定されていません。設定画面からキーを入力してください。');
  }

  const base64 = await convertImageToBase64(imageUri);
  
  const prompt = `日本酒のボトルラベルの写真です。この写真から、日本酒の銘柄名（ブランド名）、蔵元名（酒造会社名）、および味わいやペアリングの参考になる特徴の説明を読み取って推測してください。回答は必ず日本語で、以下のJSONフォーマットに従って返してください。

JSONフォーマット:
{
  "brand": "読み取った銘柄名（例：獺祭、八海山など）",
  "brewery": "読み取った蔵元名（酒造会社名。例：旭酒造など。不明な場合は空文字）",
  "characteristics": "味わいの特徴やペアリングに関する説明"
}`;

  let mimeType = 'image/jpeg';
  if (imageUri.toLowerCase().endsWith('.png')) {
    mimeType = 'image/png';
  } else if (imageUri.toLowerCase().endsWith('.webp')) {
    mimeType = 'image/webp';
  }

  const rawJson = await callGeminiApi(apiKey, prompt, base64, mimeType);
  
  try {
    const data = JSON.parse(rawJson) as GeminiSakeResponse;
    return {
      brand: data.brand || '',
      brewery: data.brewery || '',
      characteristics: data.characteristics || '',
    };
  } catch (error) {
    console.error('Failed to parse sake JSON from Gemini:', rawJson);
    throw new Error('Geminiから無効なフォーマットのデータを受信しました。');
  }
};
