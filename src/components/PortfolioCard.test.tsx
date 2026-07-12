// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PortfolioCard } from '@/components/PortfolioCard';
import type { PortfolioArtwork } from '@/lib/shared/artworks.types';

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
  width: 1600,
  height: 2400,
};

afterEach(cleanup);

describe('PortfolioCard', () => {
  it('renders database-shaped artwork data', () => {
    const { container } = render(<PortfolioCard artwork={artwork} />);

    const link = screen.getByRole('link', { name: 'View details for Blue Garden' });
    const image = screen.getByRole('img', { name: artwork.alt });
    const mobileSource = container.querySelector('source');

    expect(link.getAttribute('href')).toBe('/artwork/blue-garden');
    expect(image.getAttribute('src')).toBe(
      'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=575&format=webp',
    );
    expect(image.getAttribute('srcset')).toBe(
      [
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=350&format=webp 350w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=448&format=webp 448w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=575&format=webp 575w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=700&format=webp 700w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=746&format=webp 746w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=896&format=webp 896w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=1150&format=webp 1150w',
      ].join(', '),
    );
    expect(mobileSource?.getAttribute('srcset')).toBe(
      [
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=350&format=webp 350w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=448&format=webp 448w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=575&format=webp 575w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=700&format=webp 700w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=746&format=webp 746w',
        'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=896&format=webp 896w',
      ].join(', '),
    );
    expect(mobileSource?.getAttribute('media')).toBe('(max-width: 639px)');
    expect(image.getAttribute('sizes')).toBe(
      [
        '(max-width: 459px) calc(100vw - 48px)',
        '(max-width: 639px) calc(100vw - 64px)',
        '(max-width: 1023px) calc((100vw - 128px) / 2)',
        '(max-width: 1279px) calc((100vw - 160px) / 3)',
        '373px',
      ].join(', '),
    );
    expect(mobileSource?.getAttribute('sizes')).toBe(image.getAttribute('sizes'));
    expect(image.getAttribute('width')).toBe('1600');
    expect(image.getAttribute('height')).toBe('2400');
    expect(screen.getByRole('heading', { name: artwork.title })).toBeTruthy();
    expect(screen.getByText(artwork.category.label)).toBeTruthy();
  });

  it('does not request an image wider than its source', () => {
    render(<PortfolioCard artwork={{ ...artwork, width: 320, height: 480 }} />);

    const image = screen.getByRole('img', { name: artwork.alt });

    expect(image.getAttribute('src')).toBe(
      'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=320&format=webp',
    );
    expect(image.getAttribute('srcset')).toBe(
      'https://carla.b-cdn.net/artworks/blue-garden.jpg?width=320&format=webp 320w',
    );
  });
});
