import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors } from '../lib/theme';
import { LanguageToggle } from './LanguageToggle';

/** Right side of the home headers: language pill, then log out. Keeps the title side free for the shop name. */
export function HeaderActions({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      <LanguageToggle />
      <Pressable
        onPress={onSignOut}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('signOut')}
        style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="log-out-outline" size={26} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  signOut: { padding: 2 },
});
