/*
 * Locale hi: merges the two data parts into the same key order as before.
 */
import hiPart1 from './part1.js';
import hiPart2 from './part2.js';

const hi = {
  ...hiPart1,
  ...hiPart2
};

export default hi;
