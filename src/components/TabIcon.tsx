import { StyleSheet, View } from 'react-native';
import { theme, type ThemeColor } from '../theme';

export type TabIconName = 'calendar' | 'events' | 'receipts' | 'household';

interface Props {
  name: TabIconName;
  color: ThemeColor;
}

const SIZE = 24;
const STROKE = 2;

/**
 * 24pt outline icons for the bottom tabs, drawn from plain Views (borders,
 * radii, one rotation) like `Emblem` — no svg/font dependency, so a change
 * here ships OTA. Every stroke carries `testID="tab-icon-part"`.
 */
export function TabIcon({ name, color }: Props) {
  const c = theme.colors[color];
  const stroke = { borderColor: c, borderWidth: STROKE };
  const fill = { backgroundColor: c };
  return (
    <View
      testID={`tab-icon-${name}`}
      style={styles.box}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {name === 'calendar' ? (
        <>
          <Part style={[styles.calendarBody, stroke]} />
          <Part style={[styles.calendarHeader, fill]} />
          <Part style={[styles.calendarTick, styles.calendarTickLeft, fill]} />
          <Part style={[styles.calendarTick, styles.calendarTickRight, fill]} />
        </>
      ) : name === 'events' ? (
        <>
          <Part style={[styles.clockFace, stroke]} />
          <Part style={[styles.clockHour, fill]} />
          <Part style={[styles.clockMinute, fill]} />
        </>
      ) : name === 'receipts' ? (
        <>
          <Part style={[styles.receiptBody, stroke]} />
          <Part style={[styles.receiptLine, styles.receiptLineTop, fill]} />
          <Part style={[styles.receiptLine, styles.receiptLineBottom, fill]} />
        </>
      ) : (
        <>
          <Part style={[styles.houseRoof, { borderColor: c }]} />
          <Part style={[styles.houseBody, stroke, styles.houseBodyOpenTop]} />
          <Part style={[styles.houseDoor, stroke, styles.houseDoorOpenBottom]} />
        </>
      )}
    </View>
  );
}

function Part({ style }: { style: object }) {
  return <View testID="tab-icon-part" style={[styles.abs, style]} />;
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE },
  abs: { position: 'absolute' },

  calendarBody: { left: 2, top: 4, width: 20, height: 18, borderRadius: 5 },
  calendarHeader: { left: 2, top: 10, width: 20, height: STROKE },
  calendarTick: { top: 1, width: STROKE, height: 5, borderRadius: 1 },
  calendarTickLeft: { left: 7 },
  calendarTickRight: { left: 15 },

  clockFace: { left: 2, top: 2, width: 20, height: 20, borderRadius: 10 },
  clockHour: { left: 11, top: 6, width: STROKE, height: 6, borderRadius: 1 },
  clockMinute: { left: 11, top: 11, width: 5, height: STROKE, borderRadius: 1 },

  receiptBody: { left: 4, top: 2, width: 16, height: 20, borderRadius: 3 },
  receiptLine: { left: 8, width: 8, height: STROKE, borderRadius: 1 },
  receiptLineTop: { top: 8 },
  receiptLineBottom: { top: 13 },

  houseRoof: {
    left: 5,
    top: 4,
    width: 14,
    height: 14,
    borderTopWidth: STROKE,
    borderLeftWidth: STROKE,
    borderTopLeftRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  houseBody: { left: 4, top: 11, width: 16, height: 11, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  houseBodyOpenTop: { borderTopWidth: 0 },
  houseDoor: { left: 10, top: 15, width: 4, height: 7, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  houseDoorOpenBottom: { borderBottomWidth: 0 },
});
