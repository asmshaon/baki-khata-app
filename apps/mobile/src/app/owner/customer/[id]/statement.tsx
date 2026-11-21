import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../../../components/Avatar';
import { LoadState } from '../../../../components/Balance';
import { BigButton } from '../../../../components/BigButton';
import { errorMessage } from '../../../../lib/api';
import { formatPhone } from '../../../../lib/format';
import { useI18n, type StringKey } from '../../../../lib/i18n';
import { useCustomer, useCustomerTransactions } from '../../../../lib/queries';
import { openSms, openWhatsApp, statementText } from '../../../../lib/reminder';
import { useOwnerSession } from '../../../../lib/session';
import { colors, fontFamily, radius } from '../../../../lib/theme';

type Range = 'last5' | 'month' | 'all';
const RANGES: { id: Range; label: StringKey }[] = [
  { id: 'last5', label: 'rangeLast5' },
  { id: 'month', label: 'rangeMonth' },
  { id: 'all', label: 'rangeAll' },
];
/** Longer messages get cut off by SMS apps; "all" lists this many and says how many more there are. */
const MAX_LINES = 20;

/** Pick a range, preview the exact text, then open WhatsApp or SMS with it filled in. */
export default function Statement() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { shop } = useOwnerSession();
  const customer = useCustomer(id);
  const history = useCustomerTransactions(id);
  const [range, setRange] = useState<Range>('last5');

  if (!customer.data || !history.data) {
    const error = customer.error ?? history.error;
    return (
      <LoadState
        loading={!error}
        error={error ? errorMessage(error) : undefined}
        onRetry={() => {
          void customer.refetch();
          void history.refetch();
        }}
      />
    );
  }
  const c = customer.data;
  const all = history.data; // newest first

  const now = new Date();
  const inRange =
    range === 'last5'
      ? all.slice(0, 5)
      : range === 'month'
        ? all.filter((tx) => {
            const d = new Date(tx.createdAt);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
          })
        : all;
  const shown = inRange.slice(0, MAX_LINES);
  const text = statementText(c, shop.name, shown, inRange.length);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.who}>
        <Avatar id={c.id} name={c.name} photoUrl={c.photoUrl} size={56} />
        <View>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.phone}>{formatPhone(c.phone)}</Text>
        </View>
      </View>

      <Text style={styles.label}>{t('statementRange')}</Text>
      <View style={styles.ranges}>
        {RANGES.map((r) => {
          const on = r.id === range;
          return (
            <Pressable
              key={r.id}
              onPress={() => setRange(r.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.range, on && styles.rangeOn]}
            >
              <Text style={[styles.rangeText, on && { color: '#fff' }]}>{t(r.label)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>{t('willSend')}</Text>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>

      <View style={styles.send}>
        <BigButton icon="logo-whatsapp" label="WhatsApp" color={colors.whatsapp} onPress={() => void openWhatsApp(c.phone, text)} style={styles.flex} />
        <BigButton icon="chatbubble" label="SMS" onPress={() => void openSms(c.phone, text)} style={styles.flex} />
      </View>
      <View style={styles.noteRow}>
        <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
        <Text style={styles.note}>{t('sendNote')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  flex: { flex: 1 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily, fontSize: 22, fontWeight: '800', color: colors.text },
  phone: { fontFamily, fontSize: 16, color: colors.muted },
  label: { fontFamily, fontSize: 17, fontWeight: '700', color: colors.muted },
  ranges: { flexDirection: 'row', gap: 8 },
  range: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeText: { fontFamily, fontSize: 18, fontWeight: '800', color: colors.text },
  bubble: {
    backgroundColor: '#E7F7E1',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  bubbleText: { fontFamily, fontSize: 16, lineHeight: 25, color: colors.text },
  send: { flexDirection: 'row', gap: 12, marginTop: 4 },
  noteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  note: { fontFamily, fontSize: 14, color: colors.muted, textAlign: 'center', flexShrink: 1 },
});
