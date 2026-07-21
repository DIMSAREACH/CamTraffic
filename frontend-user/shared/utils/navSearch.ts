import type { EnterpriseModule } from '@shared/constants/enterpriseModules';

export type NavSearchItem = {
  id: string;
  path: string;
  labelKey: string;
  moduleId: string;
  keywords: string;
};

/** Flatten modules + sub-nav into searchable destinations (unique by path). */
export function flattenNavSearchItems(modules: EnterpriseModule[]): NavSearchItem[] {
  const byPath = new Map<string, NavSearchItem>();

  for (const mod of modules) {
    const baseKeywords = [
      mod.id,
      mod.path,
      ...mod.matchPrefixes,
      mod.labelKey.replace(/^sidebar\.(modules|subNav)\./, ''),
    ].join(' ');

    byPath.set(mod.path, {
      id: mod.id,
      path: mod.path,
      labelKey: mod.labelKey,
      moduleId: mod.id,
      keywords: baseKeywords,
    });

    for (const sub of mod.subNav || []) {
      if (byPath.has(sub.path)) continue;
      byPath.set(sub.path, {
        id: `${mod.id}:${sub.path}`,
        path: sub.path,
        labelKey: sub.labelKey,
        moduleId: mod.id,
        keywords: `${baseKeywords} ${sub.labelKey.replace(/^sidebar\.(modules|subNav)\./, '')} ${sub.path}`,
      });
    }
  }

  return Array.from(byPath.values());
}

export function filterNavSearchItems(
  items: NavSearchItem[],
  query: string,
  resolveLabel: (labelKey: string) => string,
): NavSearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, 8);

  const scored = items
    .map((item) => {
      const label = resolveLabel(item.labelKey).toLowerCase();
      const hay = `${label} ${item.keywords} ${item.path}`.toLowerCase();
      let score = 0;
      if (label === q) score = 100;
      else if (label.startsWith(q)) score = 80;
      else if (label.includes(q)) score = 60;
      else if (hay.includes(q)) score = 40;
      else if (q.split(/\s+/).every((part) => hay.includes(part))) score = 30;
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.labelKey.localeCompare(b.item.labelKey));

  return scored.slice(0, 10).map((row) => row.item);
}
