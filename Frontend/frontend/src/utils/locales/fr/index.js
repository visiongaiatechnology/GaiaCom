/*
 * Locale fr: merges the two data parts into the same key order as before.
 */
import frPart1 from './part1.js';
import frPart2 from './part2.js';

const fr = {
  ...frPart1,
  ...frPart2
};

export default fr;
