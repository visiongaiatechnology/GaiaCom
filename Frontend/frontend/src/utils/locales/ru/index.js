/*
 * Locale ru: merges the two data parts into the same key order as before.
 */
import ruPart1 from './part1.js';
import ruPart2 from './part2.js';

const ru = {
  ...ruPart1,
  ...ruPart2
};

export default ru;
