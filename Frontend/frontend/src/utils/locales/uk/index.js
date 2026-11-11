/*
 * Locale uk: merges the two data parts into the same key order as before.
 */
import ukPart1 from './part1.js';
import ukPart2 from './part2.js';

const uk = {
  ...ukPart1,
  ...ukPart2
};

export default uk;
