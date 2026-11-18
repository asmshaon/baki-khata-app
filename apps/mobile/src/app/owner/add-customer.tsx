import type { Customer } from '@baki/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigButton } from '../../components/BigButton';
import { ConfirmBar } from '../../components/ConfirmBar';
import { NumberEntry } from '../../components/NumberEntry';
import { TextStep } from '../../components/TextStep';
import { ApiError, api, errorMessage } from '../../lib/api';
import { formatPhone } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { pickPhoto, uploadCustomerPhoto, type PickedPhoto } from '../../lib/photo';
import { useRefreshCustomer } from '../../lib/queries';
import { colors, radius } from '../../lib/theme';

type Step = 'photo' | 'name' | 'phone' | 'confirm';

/** Photo first (so the owner recognises the person later), then name, phone, and a ✓ confirm. */
export default function AddCustomer() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const refreshCustomer = useRefreshCustomer();
  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const choosePhoto = async (source: 'camera' | 'gallery') => {
    const picked = await pickPhoto(source);
    if (picked) {
      setPhoto(picked);
      setStep('name');
    }
  };

  const create = useMutation({
    mutationFn: async () => {
      const { customer } = await api<{ customer: Customer }>('/owner/customers', {
        method: 'POST',
        body: { name: name.trim(), phone },
      });
      if (!photo) return customer;
      // The customer exists even if the photo fails; it can be added again from their page.
      return uploadCustomerPhoto(customer.id, photo)
        .then((r) => r.customer)
        .catch(() => customer);
    },
    onSuccess: (customer) => {
      refreshCustomer(customer);
      router.replace(`/owner/customer/${customer.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.field('phone')) {
        setPhoneError(err.field('phone')!);
        setStep('phone');
      }
    },
  });

  if (step === 'photo') {
    return (
      <View style={[styles.container, styles.photoStep, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.photoPlaceholder}>
          <Ionicons name="camera" size={80} color={colors.primary} />
        </View>
        <Text style={styles.heading}>{t('customerPhoto')}</Text>
        <View style={styles.buttons}>
          <BigButton icon="camera" label={t('takePhoto')} size="huge" onPress={() => choosePhoto('camera')} />
          <View style={styles.rowButtons}>
            <BigButton
              icon="images"
              label={t('gallery')}
              variant="outline"
              onPress={() => choosePhoto('gallery')}
              style={styles.flex}
            />
            <BigButton
              icon="arrow-forward"
              label={t('noPhoto')}
              variant="outline"
              color={colors.muted}
              onPress={() => setStep('name')}
              style={styles.flex}
            />
          </View>
        </View>
      </View>
    );
  }

  if (step === 'name') {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <TextStep label={t('customerName')} icon="person" value={name} onChange={setName} onDone={() => setStep('phone')} />
      </View>
    );
  }

  if (step === 'phone') {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <NumberEntry
          kind="phone"
          label={t('customerPhone')}
          icon="call"
          value={phone}
          onChange={(v) => {
            setPhoneError(null);
            setPhone(v);
          }}
          onDone={() => setStep('confirm')}
          error={phoneError}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.confirm, { paddingBottom: insets.bottom + 16 }]}>
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.preview} />
      ) : (
        <View style={[styles.preview, styles.photoPlaceholder]}>
          <Ionicons name="person" size={80} color={colors.primary} />
        </View>
      )}
      <Text style={styles.confirmName}>{name.trim()}</Text>
      <Text style={styles.confirmPhone}>{formatPhone(phone)}</Text>
      <Text style={styles.heading}>{t('addCustomerConfirm')}</Text>
      {create.isError && !phoneError ? <Text style={styles.error}>{errorMessage(create.error)}</Text> : null}
      <ConfirmBar onConfirm={() => create.mutate()} onCancel={() => router.back()} loading={create.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  photoStep: { alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, paddingHorizontal: 16 },
  photoPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  buttons: { alignSelf: 'stretch', gap: 12 },
  rowButtons: { flexDirection: 'row', gap: 12 },
  confirm: { alignItems: 'center', padding: 20, gap: 8 },
  preview: { width: 180, height: 180, borderRadius: 90, marginBottom: 8 },
  confirmName: { fontSize: 30, fontWeight: '800', color: colors.text },
  confirmPhone: { fontSize: 22, color: colors.muted, marginBottom: 16 },
  error: {
    fontSize: 18,
    color: colors.baki,
    fontWeight: '600',
    backgroundColor: colors.bakiSoft,
    padding: 12,
    borderRadius: radius.md,
  },
});
