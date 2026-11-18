import type { OwnerSession } from '@baki/shared';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigButton } from '../components/BigButton';
import { NumberEntry } from '../components/NumberEntry';
import { api, errorMessage } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useSession } from '../lib/session';
import { colors } from '../lib/theme';

export default function OwnerLogin() {
  const { signIn } = useSession();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  const login = useMutation({
    mutationFn: (input: { phone: string; pin: string }) =>
      api<OwnerSession>('/auth/owner/login', { method: 'POST', body: input }),
    onSuccess: async (session) => {
      await signIn(session);
      router.replace('/owner');
    },
    onError: () => setPin(''),
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {step === 'phone' ? (
        <>
          <NumberEntry
            kind="phone"
            label={t('yourPhone')}
            icon="call"
            value={phone}
            onChange={setPhone}
            onDone={() => setStep('pin')}
          />
          <View style={styles.footer}>
            <BigButton
              icon="add-circle"
              label={t('openNewKhata')}
              variant="outline"
              onPress={() => router.push('/owner-register')}
            />
          </View>
        </>
      ) : (
        <NumberEntry
          kind="pin"
          label={t('yourPin')}
          icon="lock-closed"
          value={pin}
          onChange={(v) => {
            login.reset();
            setPin(v);
          }}
          onDone={(value) => login.mutate({ phone, pin: value })}
          busy={login.isPending}
          error={login.error ? errorMessage(login.error) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  footer: { paddingHorizontal: 16, paddingBottom: 12 },
});
