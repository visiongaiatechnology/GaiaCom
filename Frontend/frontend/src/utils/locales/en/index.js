/*
 * Locale en: merges the two data parts into the same key order as before.
 */
import enPart1 from './part1.js';
import enPart2 from './part2.js';

const en = {
  ...enPart1,
  ...enPart2
};

export default en;
