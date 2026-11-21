import { Redirect, Stack } from 'expo-router';
import { useI18n } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { stackScreenOptions } from '../../lib/theme';

export const unstable_settings = { anchor: 'index' };

export default function OwnerLayout() {
  const { session } = useSession();
  const { t } = useI18n();
  if (session?.role !== 'owner') return <Redirect href="/" />;

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: session.shop.name, headerTitleAlign: 'left' }} />
      <Stack.Screen name="add-customer" options={{ title: t('newCustomer') }} />
      <Stack.Screen name="customer/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="customer/[id]/entry" options={{ title: '' }} />
      <Stack.Screen name="customer/[id]/edit" options={{ title: t('customerInfo') }} />
      <Stack.Screen name="customer/[id]/statement" options={{ title: t('sendStatement') }} />
      <Stack.Screen name="report" options={{ title: t('report') }} />
    </Stack>
  );
}
