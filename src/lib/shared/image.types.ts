export type ImageStorageFile = {
  path: string;
  name: string;
  isDirectory: boolean;
  sizeBytes: number | null;
  modifiedAt: string | null;
};
