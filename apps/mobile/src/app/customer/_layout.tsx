import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../lib/session';
import { stackScreenOptions } from '../../lib/theme';

export default function CustomerLayout() {
  const { session } = useSession();
  if (session?.role !== 'customer') return <Redirect href="/" />;

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: session.shop.name, headerTitleAlign: 'left' }} />
    </Stack>
  );
}
