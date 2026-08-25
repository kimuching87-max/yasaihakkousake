import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { getApiKey, saveApiKey } from '../utils/storage';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const savedKey = await getApiKey();
      setApiKey(savedKey);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('警告', 'APIキーを入力してください。空欄のままではAI画像認識機能が利用できません。', [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'このまま保存する',
          onPress: async () => {
            await saveApiKey('');
            Alert.alert('保存完了', 'APIキーを削除しました。');
            router.back();
          },
        },
      ]);
      return;
    }

    const success = await saveApiKey(apiKey.trim());
    if (success) {
      Alert.alert('完了', 'Gemini APIキーを正常に保存しました。');
      router.back();
    } else {
      Alert.alert('エラー', '保存に失敗しました。');
    }
  };

  const handleGetApiKeyHelp = () => {
    Linking.openURL('https://aistudio.google.com/');
  };

  if (loading) {
    return (
      <View style={[styles.container, isDark ? styles.bgDark : styles.bgLight, styles.center]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}>
      <View style={styles.card}>
        <Text style={[styles.title, isDark ? styles.textDark : styles.textLight]}>
          Gemini APIの設定
        </Text>
        <Text style={[styles.description, isDark ? styles.subtextDark : styles.subtextLight]}>
          料理写真から材料や手順を自動推測したり、日本酒のラベルから銘柄を読み取るには、Google Gemini APIのキーが必要です。
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDark ? styles.textDark : styles.textLight]}>
            Gemini API キー
          </Text>
          <TextInput
            style={[
              styles.input,
              isDark ? styles.inputDark : styles.inputLight,
              isDark ? styles.textDark : styles.textLight,
            ]}
            placeholder="AIzaSy..."
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry={true}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>設定を保存する</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpButton} onPress={handleGetApiKeyHelp}>
          <Text style={styles.helpButtonText}>Google AI StudioでAPIキーを無料取得する</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={[styles.infoTitle, isDark ? styles.textDark : styles.textLight]}>
          個人情報保護について
        </Text>
        <Text style={[styles.infoText, isDark ? styles.subtextDark : styles.subtextLight]}>
          設定されたAPIキーは、デバイスの内部ストレージ（AsyncStorage）にのみ保存され、Gemini APIを直接呼び出す際以外の目的で使用されることはありません。外部のサーバーへ送信されることはなく安全です。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
    color: '#4b5563',
  },
  subtextDark: {
    color: '#9ca3af',
  },
  card: {
    borderRadius: 12,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  inputLight: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  inputDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  saveButton: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  helpButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
