import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '../lib/theme';

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Only one choice at a time (payment method), otherwise any number (items taken). */
  single?: boolean;
  color: string;
};

/** Big tap-to-pick chips, so a short note can be added without typing. */
export function ChipPicker({ label, options, selected, onChange, single, color }: Props) {
  const toggle = (option: string) => {
    const on = selected.includes(option);
    if (single) onChange(on ? [] : [option]);
    else onChange(on ? selected.filter((s) => s !== option) : [...selected, option]);
  };
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => toggle(option)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={option}
              style={({ pressed }) => [
                styles.chip,
                on ? { backgroundColor: color, borderColor: color } : { borderColor: colors.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              {on ? <Ionicons name="checkmark" size={20} color="#fff" /> : null}
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: 8, marginTop: 6 },
  label: { fontFamily, fontSize: 18, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: colors.card,
  },
  chipText: { fontFamily, fontSize: 19, fontWeight: '700', color: colors.text },
});
