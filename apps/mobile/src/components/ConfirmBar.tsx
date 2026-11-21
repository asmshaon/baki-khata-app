import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors, fontFamily } from '../lib/theme';

type Props = { onConfirm: () => void; onCancel: () => void; loading?: boolean };

/** The big ✗ / ✓ pair used to confirm every important action. */
export function ConfirmBar({ onConfirm, onCancel, loading }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.bar}>
      <Choice label={t('no')} icon="close" color={colors.muted} onPress={onCancel} disabled={loading} />
      <Choice label={t('yes')} icon="checkmark" color={colors.joma} onPress={onConfirm} disabled={loading} loading={loading} />
    </View>
  );
}

function Choice({
  label,
  icon,
  color,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  icon: 'close' | 'checkmark';
  color: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.choice, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.circle, { backgroundColor: color }]}>
        {loading ? <ActivityIndicator color="#fff" size="large" /> : <Ionicons name={icon} size={64} color="#fff" />}
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 20 },
  choice: { alignItems: 'center', gap: 8 },
  circle: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily, fontSize: 22, fontWeight: '700' },
});
