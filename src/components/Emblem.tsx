import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

interface Props {
  size?: number;
}

/** Two overlapping rings — one household each. The app's only brand mark. */
export function Emblem({ size = 64 }: Props) {
  const overlap = size * 0.55;
  return (
    <View style={{ height: size, width: size + overlap }}>
      <View
        style={[
          styles.ring,
          { width: size, height: size, borderColor: theme.colors.parentA },
        ]}
      />
      <View
        style={[
          styles.ring,
          { width: size, height: size, left: overlap, borderColor: theme.colors.parentB },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderRadius: theme.radius.pill,
    borderWidth: 3,
  },
});
