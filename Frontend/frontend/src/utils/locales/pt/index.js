/*
 * Locale pt: merges the two data parts into the same key order as before.
 */
import ptPart1 from './part1.js';
import ptPart2 from './part2.js';

const pt = {
  ...ptPart1,
  ...ptPart2
};

export default pt;
