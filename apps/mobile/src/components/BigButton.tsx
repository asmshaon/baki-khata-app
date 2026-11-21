import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontFamily, radius } from '../lib/theme';

type Props = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  color?: string;
  variant?: 'solid' | 'outline';
  size?: 'normal' | 'huge';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BigButton({
  label,
  icon,
  onPress,
  color = colors.primary,
  variant = 'solid',
  size = 'normal',
  disabled,
  loading,
  style,
}: Props) {
  const solid = variant === 'solid';
  const fg = solid ? '#fff' : color;
  const huge = size === 'huge';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        huge ? styles.huge : styles.normal,
        solid ? { backgroundColor: disabled ? colors.border : color } : { borderColor: color, borderWidth: 2, backgroundColor: colors.card },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="large" />
      ) : (
        <>
          <Ionicons name={icon} size={huge ? 44 : 30} color={fg} />
          <Text style={[styles.label, huge && styles.hugeLabel, { color: fg }]} numberOfLines={2}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  normal: { minHeight: 64, flexDirection: 'row', gap: 10 },
  huge: { minHeight: 132, gap: 6, paddingVertical: 14 },
  label: { fontFamily, fontSize: 22, fontWeight: '700' },
  hugeLabel: { fontFamily, fontSize: 24, textAlign: 'center' },
});
