import compactData from 'emojibase-data/en/compact.json';
import githubShortcodes from 'emojibase-data/en/shortcodes/github.json';

// Build emoji shortcode map
// 1. Create hexcode -> emoji map from compact data
const hexcodeToEmoji: Record<string, string> = {};
compactData.forEach((item: any) => {
  if (item.hexcode && item.unicode) {
    hexcodeToEmoji[item.hexcode] = item.unicode;
  }
});

// 2. Create shortcode -> emoji map using GitHub shortcodes
const emojiMap: Record<string, string> = {};
Object.entries(githubShortcodes).forEach(([hexcode, shortcodes]) => {
  const emoji = hexcodeToEmoji[hexcode];
  if (emoji) {
    if (Array.isArray(shortcodes)) {
      shortcodes.forEach((shortcode: string) => {
        emojiMap[shortcode] = emoji;
      });
    } else if (typeof shortcodes === 'string') {
      emojiMap[shortcodes] = emoji;
    }
  }
});

// Add common aliases that might be missing
const aliases: Record<string, string> = {
  '+1': '👍',
  '-1': '👎',
  'thumbsup': '👍',
  'thumbsdown': '👎',
};

// Merge aliases
Object.assign(emojiMap, aliases);

/**
 * Parse emoji shortcodes in text and replace with actual emoji
 * Supports :emoji_name: format (GitHub-style shortcodes)
 */
export function parseEmojis(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/gi, (match, emojiName) => {
    const emoji = emojiMap[emojiName.toLowerCase()];
    return emoji || match;
  });
}

/**
 * Get all available emoji shortcodes
 */
export function getAvailableEmojis(): string[] {
  return Object.keys(emojiMap).sort();
}

/**
 * Search emojis by name
 */
export function searchEmojis(query: string): Array<{ shortcode: string; emoji: string }> {
  const lowerQuery = query.toLowerCase();
  return Object.entries(emojiMap)
    .filter(([shortcode]) => shortcode.includes(lowerQuery))
    .map(([shortcode, emoji]) => ({ shortcode, emoji }))
    .slice(0, 20); // Limit results
}
