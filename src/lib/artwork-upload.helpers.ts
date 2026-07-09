import path from 'node:path';

import { parse } from 'csv-parse/sync';

import { slugExists } from './artworks.server';
import type { ArtworkCategoryRecord } from './categories.server';

export type BulkArtworkUploadError = {
  row: number;
  filename: string | null;
  message: string;
};

export type ParsedCsvRow = {
  row: number;
  filename: string;
  title: string;
  categoryId: string;
  alt: string | undefined;
  description: string | undefined;
  sortOrder: number | undefined;
  status: string | undefined;
};

export type RawCsvRow = {
  row: number;
  [key: string]: string | number;
};

export type CategoryResolver = (input: string) => ArtworkCategoryRecord | undefined;

export function normalizeFilename(value: string) {
  return path.basename(value.trim());
}

export function buildCategoryResolver(categories: ArtworkCategoryRecord[]): CategoryResolver {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const byLabel = new Map(categories.map((category) => [category.label.toLowerCase(), category]));
  return (input: string): ArtworkCategoryRecord | undefined => {
    const value = input.trim();
    if (value.length === 0) {
      return undefined;
    }
    return byId.get(value) ?? byLabel.get(value.toLowerCase());
  };
}

function collectCategoryOrError(
  input: string,
  row: number,
  filename: string | null,
  errors: BulkArtworkUploadError[],
  resolveCategory: CategoryResolver,
) {
  const category = resolveCategory(input);
  if (!category) {
    errors.push({ row, filename, message: `Unknown category: ${input}` });
    return undefined;
  }
  if (category.status !== 'active') {
    errors.push({ row, filename, message: `Category ${input} is archived` });
    return undefined;
  }
  return category;
}

export function parseCsvRows(csvText: string): RawCsvRow[] {
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Array<Record<string, string>>;

  return rows.map((row, index) => ({ row: index + 2, ...row }));
}

export function validateCsvHeaders(rows: RawCsvRow[]) {
  if (rows.length === 0) {
    throw new Error('CSV file is empty');
  }
  const headers = Object.keys(rows[0]);
  for (const requiredHeader of ['filename', 'title', 'category_id']) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(`CSV header ${requiredHeader} is required`);
    }
  }
}

export async function getUniqueArtworkSlug(baseSlug: string, takenSlugs: Set<string>) {
  let candidate = baseSlug;
  let suffix = 2;
  while (takenSlugs.has(candidate) || (await slugExists(candidate))) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  takenSlugs.add(candidate);
  return candidate;
}

export function buildBulkErrors(
  rows: ParsedCsvRow[],
  files: File[],
  resolveCategory: CategoryResolver,
) {
  const errors: BulkArtworkUploadError[] = [];
  const filenameCounts = new Map<string, number>();
  for (const row of rows) {
    const filename = normalizeFilename(row.filename);
    filenameCounts.set(filename, (filenameCounts.get(filename) ?? 0) + 1);
  }

  for (const row of rows) {
    const filename = normalizeFilename(row.filename);
    if (filename.length === 0) {
      errors.push({ row: row.row, filename, message: 'Filename is required' });
    }
    if (filenameCounts.get(filename) !== 1) {
      errors.push({ row: row.row, filename, message: `Duplicate filename ${filename}` });
    }

    if (row.title.trim().length === 0) {
      errors.push({ row: row.row, filename, message: 'Title is required' });
    }
    if (row.categoryId.trim().length === 0) {
      errors.push({ row: row.row, filename, message: 'Category is required' });
    }
    if (!row.status) {
      errors.push({ row: row.row, filename, message: 'Status is required' });
    } else if (row.status !== 'draft' && row.status !== 'published') {
      errors.push({ row: row.row, filename, message: 'Status must be draft or published' });
    }
    if (!row.alt || row.alt.trim().length === 0) {
      errors.push({ row: row.row, filename, message: 'Alt text is required' });
    }
    if (!row.description || row.description.trim().length === 0) {
      errors.push({ row: row.row, filename, message: 'Description is required' });
    }
    if (row.sortOrder === undefined) {
      errors.push({ row: row.row, filename, message: 'Sort order is required' });
    } else if (!Number.isInteger(row.sortOrder)) {
      errors.push({ row: row.row, filename, message: 'Sort order must be an integer' });
    }

    if (!collectCategoryOrError(row.categoryId, row.row, filename, errors, resolveCategory)) {
      continue;
    }
  }

  const fileMap = new Map<string, File>();
  for (const file of files) {
    const name = normalizeFilename(file.name);
    if (fileMap.has(name)) {
      errors.push({ row: 0, filename: name, message: `Duplicate uploaded file ${name}` });
    }
    fileMap.set(name, file);
  }

  for (const row of rows) {
    const filename = normalizeFilename(row.filename);
    if (!fileMap.has(filename)) {
      errors.push({ row: row.row, filename, message: `Missing uploaded file ${filename}` });
    }
  }

  for (const file of files) {
    const name = normalizeFilename(file.name);
    if (!rows.some((row) => normalizeFilename(row.filename) === name)) {
      errors.push({
        row: 0,
        filename: name,
        message: `Uploaded file ${name} is not referenced in the CSV`,
      });
    }
  }

  return errors;
}
