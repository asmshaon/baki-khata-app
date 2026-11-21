import { useFonts } from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ApiError } from '../lib/api';
import { I18nProvider, useI18n } from '../lib/i18n';
import { SessionProvider, useSession } from '../lib/session';
import { stackScreenOptions } from '../lib/theme';

export const unstable_settings = { anchor: 'index' };

function RootStack() {
  const { ready } = useSession();
  const { ready: langReady, t } = useI18n();
  // Kalpurush, the app font (see theme.ts). On a load error, carry on with the system font.
  const [fontLoaded, fontError] = useFonts({ Kalpurush: require('../../assets/fonts/Kalpurush.ttf') });
  // The splash screen stays up until the stored session, language and font are ready.
  if (!ready || !langReady || (!fontLoaded && !fontError)) return null;

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="owner-login" options={{ title: t('roleOwner') }} />
      <Stack.Screen name="owner-register" options={{ title: t('openNewKhata') }} />
      <Stack.Screen name="customer-login" options={{ title: t('roleCustomer') }} />
      <Stack.Screen name="owner" options={{ headerShown: false }} />
      <Stack.Screen name="customer" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <SessionProvider>
          <StatusBar style="dark" />
          <RootStack />
        </SessionProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
