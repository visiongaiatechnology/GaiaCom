/*
 * Locale zh: merges the two data parts into the same key order as before.
 */
import zhPart1 from './part1.js';
import zhPart2 from './part2.js';

const zh = {
  ...zhPart1,
  ...zhPart2
};

export default zh;
