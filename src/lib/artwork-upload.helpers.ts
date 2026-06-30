import path from 'node:path';

import { parse } from 'csv-parse/sync';

import { slugExists } from './artworks.server';
import { resolveCategoryInput } from './categories.server';

export type BulkArtworkUploadError = {
  row: number;
  filename: string | null;
  message: string;
};

export type ParsedCsvRow = {
  row: number;
  filename: string;
  title: string;
  category: string;
  alt: string | undefined;
  description: string | undefined;
  slug: string | undefined;
  sortOrder: number | undefined;
  status: string | undefined;
};

export type RawCsvRow = {
  row: number;
  [key: string]: string | number;
};

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeFilename(value: string) {
  return path.basename(value.trim());
}

function collectCategoryOrError(
  input: string,
  row: number,
  filename: string | null,
  errors: BulkArtworkUploadError[],
) {
  const category = resolveCategoryInput(input);
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

export function getUniqueArtworkSlug(baseSlug: string, takenSlugs: Set<string>) {
  let candidate = baseSlug;
  let suffix = 2;
  while (takenSlugs.has(candidate) || slugExists(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  takenSlugs.add(candidate);
  return candidate;
}

export function buildBulkErrors(rows: ParsedCsvRow[], files: File[]) {
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
    if (row.category.trim().length === 0) {
      errors.push({ row: row.row, filename, message: 'Category is required' });
    }
    if (row.slug && slugify(row.slug) === '') {
      errors.push({ row: row.row, filename, message: 'Slug is invalid' });
    }
    if (row.status && row.status !== 'draft' && row.status !== 'published') {
      errors.push({ row: row.row, filename, message: 'Status must be draft or published' });
    }
    if (row.sortOrder !== undefined && !Number.isInteger(row.sortOrder)) {
      errors.push({ row: row.row, filename, message: 'Sort order must be an integer' });
    }
    if (!collectCategoryOrError(row.category, row.row, filename, errors)) {
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
