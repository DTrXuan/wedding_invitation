import React, { useState, useEffect } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  width?: number;
  quality?: number;
}

// Helper to optimize Unsplash URLs dynamically
function getOptimizedUrl(url: string, width?: number, quality?: number, blur?: boolean): string {
  if (!url || !url.includes('images.unsplash.com')) {
    return url;
  }
  try {
    const urlObj = new URL(url);
    if (width) {
      urlObj.searchParams.set('w', width.toString());
    }
    if (quality) {
      urlObj.searchParams.set('q', quality.toString());
    } else {
      urlObj.searchParams.set('q', blur ? '15' : '75');
    }
    
    urlObj.searchParams.set('auto', 'format'); // Auto format (avif/webp depending on browser)
    urlObj.searchParams.set('fit', 'crop');
    
    if (blur) {
      urlObj.searchParams.set('w', '30'); // tiny width for preview
      urlObj.searchParams.set('blur', '10'); // add blur effect
    }
    
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

export default function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  className = '',
  containerClassName = '',
  loading = 'lazy',
  fetchPriority,
  width,
  quality,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');

  // Determine current active source with optimized dimensions
  useEffect(() => {
    const initialSrc = error && fallbackSrc ? fallbackSrc : src;
    setCurrentSrc(getOptimizedUrl(initialSrc, width, quality));
  }, [src, fallbackSrc, error, width, quality]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    if (!error && fallbackSrc) {
      setError(true);
    }
  };

  // Generate lightweight blur-up preview URL if this is an Unsplash image
  const isUnsplash = currentSrc.includes('images.unsplash.com');
  const blurPlaceholderUrl = isUnsplash ? getOptimizedUrl(currentSrc, 30, 15, true) : null;

  return (
    <div className={`relative overflow-hidden w-full h-full ${containerClassName}`}>
      {/* 1. Base Shimmer Backdrop to prevent layout shifts (CLS) */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-stone-100 flex items-center justify-center z-0">
          <div className="w-full h-full bg-gradient-to-r from-stone-100 via-stone-200/50 to-stone-100 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
        </div>
      )}

      {/* 2. Micro-image progressive blur-up overlay for ultra-fast visual feedback */}
      {blurPlaceholderUrl && !isLoaded && (
        <img
          src={blurPlaceholderUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-md scale-105 transition-opacity duration-500 z-10"
          referrerPolicy="no-referrer"
        />
      )}
      
      {/* 3. Main Full-resolution image */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          onLoad={handleLoad}
          onError={handleError}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-all duration-1000 ease-out z-20 relative ${
            isLoaded 
              ? 'opacity-100 scale-100 filter brightness-100 contrast-100' 
              : 'opacity-0 scale-102 filter brightness-95 contrast-95'
          } ${className}`}
          {...props}
        />
      )}
    </div>
  );
}

