import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors } from '../lib/theme';
import { BigButton } from './BigButton';

type Props = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
  placeholder?: string;
  error?: string | null;
  optional?: boolean;
};

/**
 * A single text question (names, shop name). Only used where the keypad cannot work.
 * The ✓ button sits right under the input so the on-screen keyboard never covers it
 * (Android is edge-to-edge, so the window does not shrink when the keyboard opens).
 */
export function TextStep({ label, icon, value, onChange, onDone, placeholder, error, optional }: Props) {
  const { t } = useI18n();
  const canContinue = optional || value.trim().length > 0;
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={36} color="#fff" />
        </View>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, error ? { borderColor: colors.baki } : null]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.border}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => canContinue && onDone()}
          maxLength={80}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <BigButton
          icon="checkmark"
          label={t('ok')}
          color={colors.joma}
          onPress={onDone}
          disabled={!canContinue}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  top: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' },
  input: {
    alignSelf: 'stretch',
    minHeight: 68,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    backgroundColor: colors.card,
    fontSize: 26,
    paddingHorizontal: 16,
    color: colors.text,
  },
  error: { fontSize: 18, color: colors.baki, fontWeight: '600' },
  button: { alignSelf: 'stretch', marginTop: 4 },
});
