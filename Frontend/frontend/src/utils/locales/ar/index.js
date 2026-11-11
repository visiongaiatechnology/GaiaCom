/*
 * Locale ar: merges the two data parts into the same key order as before.
 */
import arPart1 from './part1.js';
import arPart2 from './part2.js';

const ar = {
  ...arPart1,
  ...arPart2
};

export default ar;
