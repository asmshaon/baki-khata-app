import type { Lang } from '@baki/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors } from '../lib/theme';

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: 'bn', label: 'বাং' },
  { lang: 'en', label: 'EN' },
];

/** One pill with both languages: the selected one is coloured, the other grey. Tap either side to pick it. */
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <View style={styles.pill} accessibilityRole="radiogroup" accessibilityLabel={t('language')}>
      {OPTIONS.map((option) => {
        const selected = option.lang === lang;
        return (
          <Pressable
            key={option.lang}
            onPress={() => setLang(option.lang)}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text style={[styles.text, selected ? styles.selectedText : styles.unselectedText]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 999,
    backgroundColor: '#E8EAED',
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: { minWidth: 42, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignItems: 'center' },
  selected: { backgroundColor: colors.primary },
  text: { fontSize: 15, fontWeight: '800' },
  selectedText: { color: '#fff' },
  unselectedText: { color: '#9AA0A6' },
});
