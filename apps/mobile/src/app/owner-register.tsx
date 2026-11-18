import type { OwnerSession } from '@baki/shared';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NumberEntry } from '../components/NumberEntry';
import { TextStep } from '../components/TextStep';
import { ApiError, api, errorMessage } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useSession } from '../lib/session';
import { colors } from '../lib/theme';

type Step = 'shop' | 'name' | 'phone' | 'pin' | 'pin2';

/** Opening a new ledger: one question per screen, then the account and shop are created together. */
export default function OwnerRegister() {
  const { signIn } = useSession();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('shop');
  const [shopName, setShopName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: (finalPin: string) =>
      api<OwnerSession>('/auth/owner/register', {
        method: 'POST',
        body: { shopName: shopName.trim(), name: name.trim(), phone, pin: finalPin },
      }),
    onSuccess: async (session) => {
      await signIn(session);
      router.dismissAll();
      router.replace('/owner');
    },
    onError: (err) => {
      setPin('');
      setPin2('');
      if (err instanceof ApiError && err.field('phone')) {
        setError(err.field('phone')!);
        setStep('phone');
      } else {
        setError(errorMessage(err));
        setStep('pin');
      }
    },
  });

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {step === 'shop' && (
        <TextStep
          label={t('shopName')}
          icon="storefront"
          value={shopName}
          onChange={setShopName}
          onDone={() => go('name')}
          placeholder={t('shopNamePlaceholder')}
        />
      )}
      {step === 'name' && (
        <TextStep label={t('yourName')} icon="person" value={name} onChange={setName} onDone={() => go('phone')} />
      )}
      {step === 'phone' && (
        <NumberEntry
          kind="phone"
          label={t('yourPhone')}
          icon="call"
          value={phone}
          onChange={(v) => {
            setError(null);
            setPhone(v);
          }}
          onDone={() => go('pin')}
          error={error}
        />
      )}
      {step === 'pin' && (
        <NumberEntry
          kind="pin"
          label={t('newPin')}
          icon="lock-closed"
          value={pin}
          onChange={(v) => {
            setError(null);
            setPin(v);
          }}
          onDone={() => go('pin2')}
          error={error}
        />
      )}
      {step === 'pin2' && (
        <NumberEntry
          kind="pin"
          label={t('pinAgain')}
          icon="lock-closed"
          value={pin2}
          onChange={setPin2}
          busy={register.isPending}
          onDone={(value) => {
            if (value !== pin) {
              setPin('');
              setPin2('');
              setError(t('pinMismatch'));
              setStep('pin');
              return;
            }
            register.mutate(value);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
