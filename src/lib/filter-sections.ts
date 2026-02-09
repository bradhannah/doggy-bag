import { fuzzyScore } from './fuzzy';

export type NamedItem = {
  name?: string | null;
};

export type SectionWithItems = {
  items: NamedItem[];
};

export type FilterScope = {
  categories: boolean;
  items: boolean;
};

function getItemName(item: NamedItem): string {
  return item.name ?? '';
}

function filterSectionItems<T extends SectionWithItems>(section: T, query: string): T['items'] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return section.items;
  }

  return section.items.filter((item) => fuzzyScore(trimmedQuery, getItemName(item)));
}

export function filterSectionsByQuery<T extends SectionWithItems>(
  sections: T[],
  query: string,
  scope: FilterScope,
  getSectionName: (section: T) => string
): T[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    // Return a shallow copy so Svelte detects a new array reference
    // and re-renders correctly when clearing a filter query.
    return [...sections];
  }

  return sections
    .map((section) => {
      const categoryMatched =
        scope.categories && !!fuzzyScore(trimmedQuery, getSectionName(section));
      const filteredItems = scope.items ? filterSectionItems(section, query) : [];
      const nextItems = categoryMatched ? section.items : filteredItems;

      return {
        ...section,
        items: nextItems,
      };
    })
    .filter((section) => section.items.length > 0) as T[];
}
