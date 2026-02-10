const STORAGE_HOSTS = ['storage.googleapis.com', 'googleapis.com'];
const INTERNAL_PATHS = [
  '/job-logos/',
  '/company-logos/',
  '/profiles/',
  '/job-images/',
  '/resumes/',
];

export const isInternalAssetUrl = (value?: string) => {
  if (!value) return false;
  const lower = value.toLowerCase();
  if (lower.startsWith('data:image/')) return true;
  const assetBase = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (assetBase && lower.startsWith(assetBase.toLowerCase())) return true;
  if (!INTERNAL_PATHS.some((path) => lower.includes(path))) return false;
  return STORAGE_HOSTS.some((host) => lower.includes(host));
};

export const getMaskedAssetUrl = (value?: string) => (isInternalAssetUrl(value) ? '' : value || '');
