export type BunnyStorageFile = {
  path: string;
  name: string;
  isDirectory: boolean;
  sizeBytes: number | null;
  modifiedAt: string | null;
};
