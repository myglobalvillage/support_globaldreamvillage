export const FALLBACK_VILLA_IMAGE = 'https://images.unsplash.com/photo-1586301998029-4b2db3d5f18a?auto=format&fit=crop&w=640&q=80';

/**
 * Normalizes and optimizes remote images (e.g., Unsplash, Pexels, Cloudinary)
 * to request appropriately dimensioned and compressed WebP/AVIF images.
 */
export const getOptimizedImageUrl = (url?: string, width = 640): string => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return FALLBACK_VILLA_IMAGE;
  }

  const trimmed = url.trim();

  // If it's a data URL or blob, return directly
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Unsplash dynamic format & width optimization
  if (trimmed.includes('images.unsplash.com')) {
    const clean = trimmed.split('?')[0];
    return `${clean}?auto=format&fit=crop&w=${width}&q=80`;
  }

  // Pexels dynamic compression & width
  if (trimmed.includes('images.pexels.com')) {
    const clean = trimmed.split('?')[0];
    return `${clean}?auto=compress&cs=tinysrgb&w=${width}&dpr=1`;
  }

  // Cloudinary on-the-fly transformations
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/')) {
    return trimmed.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  }

  return trimmed;
};
