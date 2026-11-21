import { Image, StyleSheet, Text, View } from 'react-native';
import { photoSource } from '../lib/api';
import { avatarColor, fontFamily } from '../lib/theme';

type Props = { id: number; name: string; photoUrl: string | null; size?: number };

/** Customer photo, or a coloured circle with the first letter so people stay recognisable. */
export function Avatar({ id, name, photoUrl, size = 56 }: Props) {
  const source = photoSource(photoUrl);
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (source) {
    return <Image source={source} style={[shape, styles.photo]} accessibilityIgnoresInvertColors />;
  }
  const initial = Array.from(name.trim())[0] ?? '?';
  return (
    <View style={[shape, styles.initial, { backgroundColor: avatarColor(id) }]}>
      <Text style={[styles.letter, { fontFamily, fontSize: size * 0.45 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: '#ddd' },
  initial: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#fff', fontWeight: '700' },
});
