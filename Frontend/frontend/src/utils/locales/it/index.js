/*
 * Locale it: merges the two data parts into the same key order as before.
 */
import itPart1 from './part1.js';
import itPart2 from './part2.js';

const it = {
  ...itPart1,
  ...itPart2
};

export default it;
