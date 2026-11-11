/*
 * Locale ko: merges the two data parts into the same key order as before.
 */
import koPart1 from './part1.js';
import koPart2 from './part2.js';

const ko = {
  ...koPart1,
  ...koPart2
};

export default ko;
