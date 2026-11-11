/*
 * Locale sq: merges the two data parts into the same key order as before.
 */
import sqPart1 from './part1.js';
import sqPart2 from './part2.js';

const sq = {
  ...sqPart1,
  ...sqPart2
};

export default sq;
