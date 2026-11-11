/*
 * Locale ja: merges the two data parts into the same key order as before.
 */
import jaPart1 from './part1.js';
import jaPart2 from './part2.js';

const ja = {
  ...jaPart1,
  ...jaPart2
};

export default ja;
