/*
 * Locale es: merges the two data parts into the same key order as before.
 */
import esPart1 from './part1.js';
import esPart2 from './part2.js';

const es = {
  ...esPart1,
  ...esPart2
};

export default es;
