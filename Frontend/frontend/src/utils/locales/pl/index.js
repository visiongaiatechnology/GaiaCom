/*
 * Locale pl: merges the two data parts into the same key order as before.
 */
import plPart1 from './part1.js';
import plPart2 from './part2.js';

const pl = {
  ...plPart1,
  ...plPart2
};

export default pl;
