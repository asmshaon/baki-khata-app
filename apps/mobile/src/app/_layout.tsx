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
  if (!ready || !langReady) return null; // the splash screen stays up until stored session and language are read

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
