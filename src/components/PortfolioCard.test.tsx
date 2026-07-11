// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PortfolioCard } from '@/components/PortfolioCard';
import type { PortfolioArtwork } from '@/lib/artworks.types';

const artwork: PortfolioArtwork = {
  slug: 'blue-garden',
  title: 'Blue Garden',
  category: {
    id: 'c001',
    categorySlug: 'illustration',
    label: 'Illustration',
  },
  cdnUrl: 'https://carla.b-cdn.net/artworks/blue-garden.jpg',
  alt: 'Blue flowers in a garden',
  width: 800,
  height: 1200,
};

afterEach(cleanup);

describe('PortfolioCard', () => {
  it('renders database-shaped artwork data', () => {
    render(<PortfolioCard artwork={artwork} />);

    const link = screen.getByRole('link', { name: 'View details for Blue Garden' });
    const image = screen.getByRole('img', { name: artwork.alt });

    expect(link.getAttribute('href')).toBe('/artwork/blue-garden');
    expect(image.getAttribute('src')).toBe(artwork.cdnUrl);
    expect(image.getAttribute('width')).toBe('800');
    expect(image.getAttribute('height')).toBe('1200');
    expect(screen.getByRole('heading', { name: artwork.title })).toBeTruthy();
    expect(screen.getByText(artwork.category.label)).toBeTruthy();
  });
});
