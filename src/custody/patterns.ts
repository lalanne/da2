import type { PresetLabel } from '../models/Custody';
import { weekdayMonday0 } from './dates';

/**
 * Preset → `cycle` array. Every preset is just a cycle of parent indices
 * (0 = parentIds[0], 1 = parentIds[1]); the calendar has one computation
 * path regardless of preset.
 *
 * `anchorDate` is cycle position 0. For the weekday-sensitive presets the
 * cycle is rotated so that position 0 lines up with the anchor's weekday,
 * which lets the setup screen anchor on "today" without forcing a Monday.
 */

function rotate(cycle: number[], by: number): number[] {
  const n = cycle.length;
  const k = ((by % n) + n) % n;
  return [...cycle.slice(k), ...cycle.slice(0, k)];
}

export function buildCycle(preset: PresetLabel, anchorDate: string): number[] {
  const wd = weekdayMonday0(anchorDate); // 0 = Mon … 6 = Sun

  switch (preset) {
    case 'alternating-weeks':
      // parentIds[0] the first 7 days from the anchor, parentIds[1] the next 7.
      return [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1];

    case 'every-other-weekend': {
      // parentIds[0] is the residential parent; parentIds[1] gets Sat+Sun
      // every other week. Week 1 (Mon-index): weekend to [1]; week 2: all [0].
      const monAligned = [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0];
      return rotate(monAligned, wd);
    }

    case '2-2-3': {
      // 14-day 2-2-3: [0][0] [1][1] [0][0][0] | [1][1] [0][0] [1][1][1]
      const monAligned = [0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1];
      return rotate(monAligned, wd);
    }

    case 'custom':
    default:
      // Caller supplies the array; default to alternating weeks.
      return [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1];
  }
}

export function isValidCycle(cycle: unknown): cycle is number[] {
  return (
    Array.isArray(cycle) &&
    (cycle.length === 7 || cycle.length === 14) &&
    cycle.every((v) => v === 0 || v === 1) &&
    cycle.some((v) => v === 0) &&
    cycle.some((v) => v === 1)
  );
}
