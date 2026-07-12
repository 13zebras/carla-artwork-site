export const ARTWORK_CATEGORIES = {
  illustration: 'Illustration',
  fineArtCollage: 'Fine Art Collage',
  graphicDesign: 'Graphic Design',
  food: 'Food',
  botanicalIllustration: 'Botanical Illustration',
  specialProjects: 'Special Projects',
} as const;

export type ArtworkCategory = keyof typeof ARTWORK_CATEGORIES;

export const ARTWORK_CATEGORY_SLUGS = {
  illustration: 'illustration',
  fineArtCollage: 'fine-art-collage',
  graphicDesign: 'graphic-design',
  food: 'food',
  botanicalIllustration: 'botanical-illustration',
  specialProjects: 'special-projects',
} as const satisfies Record<ArtworkCategory, string>;

export type ArtworkCategorySlug = (typeof ARTWORK_CATEGORY_SLUGS)[ArtworkCategory];

const ARTWORK_CATEGORY_BY_SLUG = {
  [ARTWORK_CATEGORY_SLUGS.illustration]: 'illustration',
  [ARTWORK_CATEGORY_SLUGS.fineArtCollage]: 'fineArtCollage',
  [ARTWORK_CATEGORY_SLUGS.graphicDesign]: 'graphicDesign',
  [ARTWORK_CATEGORY_SLUGS.food]: 'food',
  [ARTWORK_CATEGORY_SLUGS.botanicalIllustration]: 'botanicalIllustration',
  [ARTWORK_CATEGORY_SLUGS.specialProjects]: 'specialProjects',
} as const satisfies Record<ArtworkCategorySlug, ArtworkCategory>;

export function getArtworkCategoryBySlug(slug: string): ArtworkCategory | undefined {
  if (slug in ARTWORK_CATEGORY_BY_SLUG) {
    return ARTWORK_CATEGORY_BY_SLUG[slug as ArtworkCategorySlug];
  }

  return undefined;
}

// Used as category page content in demo mode.
export const artworkCategoryDescriptions = {
  illustration:
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  fineArtCollage:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  graphicDesign:
    'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.',
  food: 'Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Et harum quidem rerum facilis est et expedita distinctio.',
  botanicalIllustration:
    'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  specialProjects:
    'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
} as const satisfies Record<ArtworkCategory, string>;
