import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors, radius } from '../lib/theme';

type Props = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onDone?: () => void;
  doneEnabled?: boolean;
  doneColor?: string;
};

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/** Large on-screen number pad with English digits (phone, PIN and money are shown in English digits). Used instead of the system keyboard. */
export function Keypad({ onDigit, onBackspace, onDone, doneEnabled = false, doneColor = colors.joma }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.pad}>
      {ROWS.map((row) => (
        <View key={row.join('')} style={styles.row}>
          {row.map((d) => (
            <Key key={d} label={d} onPress={() => onDigit(d)} accessibilityLabel={d} />
          ))}
        </View>
      ))}
      <View style={styles.row}>
        <Key onPress={onBackspace} accessibilityLabel={t('delete')}>
          <Ionicons name="backspace-outline" size={34} color={colors.text} />
        </Key>
        <Key label="0" onPress={() => onDigit('0')} accessibilityLabel="0" />
        {onDone ? (
          <Key onPress={onDone} disabled={!doneEnabled} background={doneEnabled ? doneColor : colors.border} accessibilityLabel={t('ok')}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </Key>
        ) : (
          <View style={styles.key} />
        )}
      </View>
    </View>
  );
}

function Key({
  label,
  children,
  onPress,
  disabled,
  background,
  accessibilityLabel,
}: {
  label?: string;
  children?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  background?: string;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.key,
        styles.keyFace,
        { backgroundColor: background ?? (pressed ? colors.keypadPressed : colors.keypad) },
        pressed && background ? { opacity: 0.8 } : null,
      ]}
    >
      {label ? <Text style={styles.keyText}>{label}</Text> : children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  key: { flex: 1, height: 68 },
  keyFace: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyText: { fontSize: 32, fontWeight: '600', color: colors.text },
});
