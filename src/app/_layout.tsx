import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
          },
          headerTintColor: colorScheme === 'dark' ? '#f3f4f6' : '#1f2937',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: '野菜・発酵・日本酒ペアリング',
          }}
        />
        <Stack.Screen
          name="recipe/[id]"
          options={{
            title: 'レシピ詳細',
          }}
        />
        <Stack.Screen
          name="recipe/edit"
          options={{
            title: 'レシピの作成・編集',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: '設定',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

