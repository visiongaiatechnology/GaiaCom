/*
 * Locale id: merges the two data parts into the same key order as before.
 */
import idPart1 from './part1.js';
import idPart2 from './part2.js';

const id = {
  ...idPart1,
  ...idPart2
};

export default id;
