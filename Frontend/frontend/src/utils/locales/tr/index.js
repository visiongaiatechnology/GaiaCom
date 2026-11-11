/*
 * Locale tr: merges the two data parts into the same key order as before.
 */
import trPart1 from './part1.js';
import trPart2 from './part2.js';

const tr = {
  ...trPart1,
  ...trPart2
};

export default tr;
