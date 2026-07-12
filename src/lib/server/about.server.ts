import { createHash } from 'node:crypto';

import { imageSize } from 'image-size';

import type { AboutContent } from '../shared/about.types';
import { requireAdminFromRequest } from './auth-session.server';
import { deleteFromBunnyStorage, getBunnyCdnUrl, uploadToBunnyStorage } from './bunny.server';
import { ensureSchema } from './db.server';
import { getSiteSettings, updateAboutSettings } from './site-settings.server';

const MAX_IMAGE_SIZE = 50_000_000;

type AboutImage = {
  file: File;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
  checksumSha256: string;
};

function getVersionedImageUrl(storagePath: string | null, updatedAt: string) {
  if (!storagePath) {
    return null;
  }

  const cdnUrl = getBunnyCdnUrl(storagePath);
  const url = new URL(cdnUrl);
  url.searchParams.set('v', updatedAt);
  return url.toString();
}

export function toAboutContent(
  settings: Awaited<ReturnType<typeof getSiteSettings>>,
): AboutContent {
  return {
    text: settings.aboutText,
    mobileImagePath: settings.aboutMobileImagePath,
    mobileImageUrl: getVersionedImageUrl(settings.aboutMobileImagePath, settings.updatedAt),
    desktopImagePath: settings.aboutDesktopImagePath,
    desktopImageUrl: getVersionedImageUrl(settings.aboutDesktopImagePath, settings.updatedAt),
    imageAlt: settings.aboutImageAlt,
    updatedAt: settings.updatedAt,
  };
}

function optionalFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }
  return value;
}

function isRemovalRequested(value: FormDataEntryValue | null) {
  return value?.toString() === 'true';
}

async function prepareImage(file: File): Promise<AboutImage> {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`File ${file.name} is larger than 50MB`);
  }

  const types = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  } as const;
  const contentType = file.type as keyof typeof types;
  const extension = types[contentType];
  if (!extension) {
    throw new Error(`File ${file.name} must be a JPEG, PNG, or WebP image`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error(`File ${file.name} is empty`);
  }

  const dimensions = imageSize(buffer);
  if (typeof dimensions.width !== 'number' || typeof dimensions.height !== 'number') {
    throw new Error(`Could not read dimensions for ${file.name}`);
  }

  return {
    file,
    contentType,
    extension,
    checksumSha256: createHash('sha256').update(buffer).digest('hex'),
  };
}

export function buildAboutImageStoragePath(
  variant: 'mobile' | 'desktop',
  extension: AboutImage['extension'],
) {
  return `siteImages/about-page-photo-${variant}.${extension}`;
}

async function uploadAboutImage(image: AboutImage, variant: 'mobile' | 'desktop') {
  const storagePath = buildAboutImageStoragePath(variant, image.extension);
  await uploadToBunnyStorage({
    storagePath,
    file: image.file,
    contentType: image.contentType,
    checksumSha256: image.checksumSha256,
  });
  return storagePath;
}

export async function getAboutContent() {
  await ensureSchema();
  return toAboutContent(await getSiteSettings());
}

export async function saveAboutContent(formData: FormData) {
  await ensureSchema();
  await requireAdminFromRequest();

  const current = await getSiteSettings();
  const text = formData.get('text')?.toString() ?? '';
  const imageAlt = formData.get('image_alt')?.toString().trim() ?? '';
  const mobileFile = optionalFile(formData.get('mobile_image'));
  const desktopFile = optionalFile(formData.get('desktop_image'));
  const removeMobile = isRemovalRequested(formData.get('remove_mobile'));
  const removeDesktop = isRemovalRequested(formData.get('remove_desktop'));

  if (mobileFile && removeMobile) {
    throw new Error('Choose either a replacement or removal for the mobile photo');
  }
  if (desktopFile && removeDesktop) {
    throw new Error('Choose either a replacement or removal for the desktop photo');
  }

  const [mobileImage, desktopImage] = await Promise.all([
    mobileFile ? prepareImage(mobileFile) : null,
    desktopFile ? prepareImage(desktopFile) : null,
  ]);

  let mobileImagePath = removeMobile ? null : current.aboutMobileImagePath;
  let desktopImagePath = removeDesktop ? null : current.aboutDesktopImagePath;

  if (mobileImage) {
    mobileImagePath = buildAboutImageStoragePath('mobile', mobileImage.extension);
  }
  if (desktopImage) {
    desktopImagePath = buildAboutImageStoragePath('desktop', desktopImage.extension);
  }
  if ((mobileImagePath || desktopImagePath) && imageAlt.length === 0) {
    throw new Error('Alt text is required when an about photo is present');
  }

  if (mobileImage) {
    await uploadAboutImage(mobileImage, 'mobile');
  }
  if (desktopImage) {
    await uploadAboutImage(desktopImage, 'desktop');
  }

  const stalePaths = new Set<string>();
  if (current.aboutMobileImagePath && current.aboutMobileImagePath !== mobileImagePath) {
    stalePaths.add(current.aboutMobileImagePath);
  }
  if (current.aboutDesktopImagePath && current.aboutDesktopImagePath !== desktopImagePath) {
    stalePaths.add(current.aboutDesktopImagePath);
  }
  await Promise.all([...stalePaths].map((storagePath) => deleteFromBunnyStorage(storagePath)));

  const settings = await updateAboutSettings({
    aboutText: text,
    aboutMobileImagePath: mobileImagePath,
    aboutDesktopImagePath: desktopImagePath,
    aboutImageAlt: mobileImagePath || desktopImagePath ? imageAlt : '',
  });

  return toAboutContent(settings);
}
