import type { Customer, CustomerUpdateInput } from '@baki/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadState } from '../../../../components/Balance';
import { BigButton } from '../../../../components/BigButton';
import { NumberEntry } from '../../../../components/NumberEntry';
import { ApiError, api, errorMessage } from '../../../../lib/api';
import { useI18n } from '../../../../lib/i18n';
import { useCustomer, useRefreshCustomer } from '../../../../lib/queries';
import { colors, radius } from '../../../../lib/theme';

/** Edit name/address, and set the PIN the customer uses to see their own khata. */
export default function EditCustomer() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const customer = useCustomer(id);

  if (!customer.data) {
    return (
      <LoadState
        loading={customer.isPending}
        error={customer.error ? errorMessage(customer.error) : undefined}
        onRetry={() => void customer.refetch()}
      />
    );
  }
  return <EditForm customer={customer.data} />;
}

function EditForm({ customer }: { customer: Customer }) {
  const id = customer.id;
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const refreshCustomer = useRefreshCustomer();
  const [step, setStep] = useState<'form' | 'pin'>('form');
  const [name, setName] = useState(customer.name);
  const [address, setAddress] = useState(customer.address ?? '');
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: CustomerUpdateInput) =>
      api<{ customer: Customer }>(`/owner/customers/${id}`, { method: 'PATCH', body: input }).then((r) => r.customer),
    onSuccess: refreshCustomer,
  });

  if (step === 'pin') {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <NumberEntry
          kind="pin"
          label={t('customerPinFor')}
          icon="key"
          value={pin}
          onChange={setPin}
          busy={update.isPending}
          error={update.isError ? errorMessage(update.error) : null}
          onDone={(value) =>
            update.mutate(
              { pin: value },
              {
                onSuccess: () => {
                  setSavedPin(value);
                  setPin('');
                  setStep('form');
                },
                onError: () => setPin(''),
              },
            )
          }
        />
      </View>
    );
  }

  const nameError = update.error instanceof ApiError ? update.error.field('name') : undefined;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        <Field icon="person" label={t('name')}>
          <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} />
          {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
        </Field>
        <Field icon="location" label={t('address')}>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} maxLength={160} placeholder={t('optional')} />
        </Field>

        <BigButton
          icon="checkmark"
          label={t('save')}
          color={colors.joma}
          disabled={!name.trim()}
          loading={update.isPending}
          onPress={() =>
            update.mutate({ name: name.trim(), address: address.trim() }, { onSuccess: () => router.back() })
          }
        />
        {update.isError && !nameError ? <Text style={styles.error}>{errorMessage(update.error)}</Text> : null}

        <View style={styles.pinCard}>
          <Ionicons name="key" size={32} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pinTitle}>{t('customerPin')}</Text>
            <Text style={styles.pinHint}>
              {savedPin
                ? t('pinSaved', { pin: savedPin })
                : customer.hasPin
                  ? t('pinIsSet')
                  : t('pinNotSet')}
            </Text>
          </View>
        </View>
        <BigButton
          icon="key"
          label={t(customer.hasPin || savedPin ? 'changePin' : 'setPin')}
          variant="outline"
          onPress={() => {
            update.reset();
            setStep('pin');
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, label, children }: { icon: 'person' | 'location'; label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <Ionicons name={icon} size={22} color={colors.muted} />
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { padding: 16, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 18, fontWeight: '700', color: colors.muted },
  input: {
    minHeight: 60,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    fontSize: 22,
    paddingHorizontal: 14,
    color: colors.text,
  },
  error: { fontSize: 16, color: colors.baki, fontWeight: '600' },
  pinCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 12,
  },
  pinTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  pinHint: { fontSize: 16, color: colors.text, marginTop: 2 },
});
