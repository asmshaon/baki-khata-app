import type { PaymentMethod, TransactionType } from '@baki/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../../../components/Avatar';
import { balanceTone, LoadState } from '../../../../components/Balance';
import { ChipPicker } from '../../../../components/ChipPicker';
import { ConfirmBar } from '../../../../components/ConfirmBar';
import { NumberEntry } from '../../../../components/NumberEntry';
import { errorMessage } from '../../../../lib/api';
import { formatTaka } from '../../../../lib/format';
import { useI18n, type StringKey } from '../../../../lib/i18n';
import { METHOD_LABEL, METHODS } from '../../../../lib/methods';
import { promiseOptions } from '../../../../lib/promise';
import { useAddEntry, useCustomer } from '../../../../lib/queries';
import { colors, fontFamily, radius } from '../../../../lib/theme';

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

/** Common items offered as one-tap notes for baki. */
const ITEMS: StringKey[] = ['itemRice', 'itemLentil', 'itemOil', 'itemSugar', 'itemEgg', 'itemVeg', 'itemSoap', 'itemRecharge'];

const COPY: Record<TransactionType, { title: StringKey; question: StringKey; color: string; soft: string }> = {
  baki: { title: 'bakiGiven', question: 'howMuchBaki', color: colors.baki, soft: colors.bakiSoft },
  joma: { title: 'paymentReceived', question: 'howMuchJoma', color: colors.joma, soft: colors.jomaSoft },
};

/**
 * Amount on the keypad (with one-tap amounts), then a confirm screen with
 * optional one-tap notes: items for baki plus "when will they pay", or the
 * payment method for joma. ✓ saves.
 */
export default function Entry() {
  const params = useLocalSearchParams<{ id: string; type: string }>();
  const id = Number(params.id);
  const type: TransactionType = params.type === 'joma' ? 'joma' : 'baki';
  const copy = COPY[type];
  const insets = useSafeAreaInsets();
  const { t, day } = useI18n();
  const customer = useCustomer(id);
  const addEntry = useAddEntry(id);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'amount' | 'confirm'>('amount');
  const [items, setItems] = useState<string[]>([]);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [promise, setPromise] = useState<StringKey | null>(null);
  const promises = useMemo(() => promiseOptions(), []);

  if (!customer.data) {
    return (
      <LoadState
        loading={customer.isPending}
        error={customer.error ? errorMessage(customer.error) : undefined}
        onRetry={() => void customer.refetch()}
      />
    );
  }
  const c = customer.data;
  const value = Number(amount);
  const newBalance = c.balance + (type === 'baki' ? value : -value);
  const newTone = balanceTone(newBalance);

  const save = () => {
    const chosen = promises.find((p) => p.key === promise);
    addEntry.mutate(
      {
        type,
        amount: value,
        note: items.join(', ') || undefined,
        method: method ?? undefined,
        // "Don't know" clears an old promise; no choice leaves it as it was.
        promisedOn: type === 'baki' && chosen ? chosen.day : undefined,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{ title: t(copy.title), headerStyle: { backgroundColor: copy.color }, headerTintColor: '#fff' }}
      />
      {step === 'amount' ? (
        <NumberEntry
          kind="amount"
          label={t(copy.question)}
          icon={type === 'baki' ? 'arrow-up-circle' : 'cash'}
          value={amount}
          onChange={setAmount}
          onDone={() => setStep('confirm')}
          accent={copy.color}
          quickAmounts={QUICK_AMOUNTS}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.confirm}>
          <View style={styles.summary}>
            <Avatar id={c.id} name={c.name} photoUrl={c.photoUrl} size={60} />
            <Text style={styles.name} numberOfLines={2}>
              {c.name}
            </Text>
            <Text style={[styles.amount, { color: copy.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatTaka(value)}
            </Text>
          </View>

          {type === 'baki' ? (
            <>
              <ChipPicker
                label={t('whatTaken')}
                options={ITEMS.map((key) => t(key))}
                selected={items}
                onChange={setItems}
                color={copy.color}
              />
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Ionicons name="calendar-outline" size={22} color={colors.promise} />
                  <Text style={styles.sectionLabel}>{t('whenPay')}</Text>
                </View>
                <View style={styles.promiseGrid}>
                  {promises.map((p) => {
                    const on = promise === p.key;
                    return (
                      <Pressable
                        key={p.key}
                        onPress={() => setPromise(on ? null : p.key)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        style={({ pressed }) => [
                          styles.promise,
                          on && { backgroundColor: colors.promise, borderColor: colors.promise },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text style={[styles.promiseLabel, on && { color: '#fff' }]}>{t(p.key)}</Text>
                        <Text style={[styles.promiseDate, on && { color: '#fff' }]}>{p.day ? day(p.day) : t('noDate')}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          ) : (
            <ChipPicker
              label={t('howPaid')}
              options={METHODS.map((m) => t(METHOD_LABEL[m]))}
              selected={method ? [t(METHOD_LABEL[method])] : []}
              onChange={(picked) => setMethod(METHODS.find((m) => t(METHOD_LABEL[m]) === picked[0]) ?? null)}
              single
              color={copy.color}
            />
          )}

          <Text style={styles.after}>
            {t('afterThis')} <Text style={{ color: newTone.color, fontWeight: '800' }}>{t(newTone.label)}</Text>
            {newBalance !== 0 ? (
              <Text style={{ color: newTone.color, fontWeight: '800' }}> {formatTaka(newBalance)}</Text>
            ) : null}
          </Text>

          {addEntry.isError ? <Text style={styles.error}>{errorMessage(addEntry.error)}</Text> : null}

          <ConfirmBar
            loading={addEntry.isPending}
            onCancel={() => {
              addEntry.reset();
              setStep('amount');
            }}
            onConfirm={save}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  confirm: { alignItems: 'center', padding: 16, gap: 12 },
  summary: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
  },
  name: { fontFamily, flex: 1, fontSize: 22, fontWeight: '800', color: colors.text },
  amount: { fontFamily, fontSize: 32, fontWeight: '800', maxWidth: '50%' },
  section: { alignSelf: 'stretch', gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sectionLabel: { fontFamily, fontSize: 18, fontWeight: '700', color: colors.muted },
  promiseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  promise: {
    width: '48.5%',
    minHeight: 60,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  promiseLabel: { fontFamily, fontSize: 18, fontWeight: '800', color: colors.text },
  promiseDate: { fontFamily, fontSize: 14, color: colors.muted },
  after: { fontFamily, fontSize: 20, color: colors.text, textAlign: 'center', marginTop: 4 },
  error: {
    fontFamily,
    fontSize: 18,
    color: colors.baki,
    fontWeight: '600',
    backgroundColor: colors.bakiSoft,
    padding: 12,
    borderRadius: radius.md,
  },
});
