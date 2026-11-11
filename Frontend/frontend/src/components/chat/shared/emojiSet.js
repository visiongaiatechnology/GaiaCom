/**
 * Composer emoji set and reaction values.
 *
 * Emoji are message *content* in a messenger (the user types or reacts with
 * them). They are NOT UI icons: chrome uses components/ui/Icon only. The values
 * are reaction keys persisted by the backend, therefore they must stay byte
 * identical to the legacy set. That is why they are written as escapes and
 * never as visible glyphs in source.
 */
export const COMPOSER_EMOJIS = [
  '\u{1F600}', '\u{1F604}', '\u{1F602}', '\u{1F60A}', '\u{1F60D}', '\u{1F60E}',
  '\u{1F91D}', '\u{1F64F}', '\u{1F44D}', '\u{1F525}', '\u{2728}', '\u{1F680}',
  '\u{1F512}', '\u{1F6E1}\u{FE0F}', '\u{26A1}', '\u{2705}', '\u{2757}', '\u{2764}\u{FE0F}'
];

export const REACTION_EMOJIS = [
  '\u{1F44D}',
  '\u{2764}\u{FE0F}',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F525}',
  '\u{2705}'
];

export const REACTION_LABELS = {
  '\u{1F44D}': 'Gefällt mir',
  '\u{2764}\u{FE0F}': 'Herz',
  '\u{1F602}': 'Lachen',
  '\u{1F62E}': 'Überrascht',
  '\u{1F525}': 'Feuer',
  '\u{2705}': 'Bestätigt'
};

export function reactionLabel(emoji) {
  return REACTION_LABELS[emoji] || 'Reaktion';
}