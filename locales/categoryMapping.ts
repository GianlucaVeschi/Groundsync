// Bidirectional category translation mapping
// This allows categories stored in English to be displayed in German and vice versa

export const categoryMapping = {
  en: {
    'Landscape': 'Landscape',
    'Construction': 'Construction',
    'Irrigation': 'Irrigation',
    'Lighting': 'Lighting',
    'Site Safety': 'Site Safety',
    // German to English mappings
    'Landschaftsbau': 'Landscape',
    'Bauwesen': 'Construction',
    'Bewässerung': 'Irrigation',
    'Beleuchtung': 'Lighting',
    'Arbeitssicherheit': 'Site Safety',
  },
  de: {
    'Landscape': 'Landschaftsbau',
    'Construction': 'Bauwesen',
    'Irrigation': 'Bewässerung',
    'Lighting': 'Beleuchtung',
    'Site Safety': 'Arbeitssicherheit',
    // German to German (identity mapping)
    'Landschaftsbau': 'Landschaftsbau',
    'Bauwesen': 'Bauwesen',
    'Bewässerung': 'Bewässerung',
    'Beleuchtung': 'Beleuchtung',
    'Arbeitssicherheit': 'Arbeitssicherheit',
  },
} as const;

/**
 * Translates a category to the target language
 * @param category - The category name in any language
 * @param targetLang - The target language code ('en' or 'de')
 * @returns The translated category name, or the original if no mapping exists
 */
export const translateCategory = (category: string, targetLang: 'en' | 'de'): string => {
  const mapping = categoryMapping[targetLang];
  return mapping[category as keyof typeof mapping] || category;
};

/**
 * Gets all default categories in the specified language
 * @param lang - The language code ('en' or 'de')
 * @returns Array of default category names in the specified language
 */
export const getDefaultCategories = (lang: 'en' | 'de'): string[] => {
  if (lang === 'de') {
    return ['Landschaftsbau', 'Bauwesen', 'Bewässerung', 'Beleuchtung', 'Arbeitssicherheit'];
  }
  return ['Landscape', 'Construction', 'Irrigation', 'Lighting', 'Site Safety'];
};
