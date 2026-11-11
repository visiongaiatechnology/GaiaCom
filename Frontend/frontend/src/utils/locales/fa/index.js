/*
 * Locale fa: merges the two data parts into the same key order as before.
 */
import faPart1 from './part1.js';
import faPart2 from './part2.js';

const fa = {
  ...faPart1,
  ...faPart2
};

export default fa;
