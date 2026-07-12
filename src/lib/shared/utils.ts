import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getParagraphs(text: string) {
  let position = 0;

  return text
    .split(/\r?\n[\t ]*\r?\n+/)
    .map((value) => {
      const paragraph = value.trim();
      const id = `${position}-${paragraph.length}`;
      position += value.length;
      return { id, text: paragraph };
    })
    .filter((paragraph) => Boolean(paragraph.text));
}

export const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
