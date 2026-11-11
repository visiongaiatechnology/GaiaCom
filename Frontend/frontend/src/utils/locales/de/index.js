/*
 * Locale de: merges the two data parts into the same key order as before.
 */
import dePart1 from './part1.js';
import dePart2 from './part2.js';

const de = {
  ...dePart1,
  ...dePart2
};

export default de;
