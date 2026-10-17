import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { COLORS } from '../lib/theme';
import { useEffect, useState } from 'react';
import { getDb } from '../lib/database';
import { LanguageProvider } from '../lib/useLanguage';

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = COLORS[scheme === 'dark' ? 'dark' : 'light'];
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getDb().then(() => setReady(true)).catch(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <LanguageProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="result"
          options={{
            headerShown: true,
            headerTitle: '',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
          }}
        />
      </Stack>
    </LanguageProvider>
  );
}
