import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageToggle } from '../components/LanguageToggle';
import { useI18n } from '../lib/i18n';
import { useSession } from '../lib/session';
import { colors, fontFamily, radius } from '../lib/theme';

/** Role picker: shop owner or customer. Signed-in users skip straight to their home. */
export default function Welcome() {
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  if (session?.role === 'owner') return <Redirect href="/owner" />;
  if (session?.role === 'customer') return <Redirect href="/customer" />;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.toggle, { top: insets.top + 12 }]}>
        <LanguageToggle />
      </View>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="book" size={52} color="#fff" />
        </View>
        <Text style={styles.title}>{t('appName')}</Text>
        <Text style={styles.tagline}>{t('tagline')}</Text>
      </View>

      <View style={styles.choices}>
        <Text style={styles.subtitle}>{t('whoAreYou')}</Text>
        <RoleCard
          icon="storefront"
          label={t('roleOwner')}
          color={colors.primary}
          soft={colors.primarySoft}
          onPress={() => router.push('/owner-login')}
        />
        <RoleCard
          icon="person"
          label={t('roleCustomer')}
          color={colors.joma}
          soft={colors.jomaSoft}
          onPress={() => router.push('/customer-login')}
        />
      </View>
    </View>
  );
}

function RoleCard({
  icon,
  label,
  color,
  soft,
  onPress,
}: {
  icon: 'storefront' | 'person';
  label: string;
  color: string;
  soft: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, { borderColor: color, backgroundColor: soft }, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.cardIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={56} color="#fff" />
      </View>
      <Text style={[styles.cardLabel, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={36} color={color} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, justifyContent: 'space-between' },
  toggle: { position: 'absolute', right: 16, zIndex: 1 },
  brand: { alignItems: 'center', gap: 10 },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.baki,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily, fontSize: 40, fontWeight: '800', color: colors.text },
  tagline: { fontFamily, fontSize: 18, color: colors.muted, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontFamily, fontSize: 24, color: colors.text, fontWeight: '700', textAlign: 'center' },
  choices: { gap: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 3,
    borderRadius: radius.lg,
    padding: 20,
    minHeight: 130,
  },
  cardIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { flex: 1, fontFamily, fontSize: 30, fontWeight: '800' },
  chevron: { marginLeft: 'auto' },
});
