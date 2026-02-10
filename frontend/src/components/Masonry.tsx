import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';

const useMedia = (queries: string[], values: number[], defaultValue: number): number => {
  const get = () => values[queries.findIndex(q => matchMedia(q).matches)] ?? defaultValue;

  const [value, setValue] = useState<number>(get);

  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach(q => matchMedia(q).addEventListener('change', handler));
    return () => queries.forEach(q => matchMedia(q).removeEventListener('change', handler));
  }, [queries]);

  return value;
};

const useMeasure = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const updateSize = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    // Ensure we always capture an initial size even if ResizeObserver
    // doesn't fire immediately in some browser/layout timing cases.
    updateSize();

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return [ref, size] as const;
};

const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(
    urls.map(
      src =>
        new Promise<void>(resolve => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        })
    )
  );
};

interface Item {
  id: string;
  img: string;
  url: string;
  height: number;
}

interface GridItem extends Item {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GridLayout {
  items: GridItem[];
  height: number;
}

interface MasonryProps {
  items: Item[];
  ease?: string;
  duration?: number;
  stagger?: number;
  initialDelay?: number;
  animateFrom?: 'bottom' | 'top' | 'left' | 'right' | 'center' | 'random';
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
  colorShiftOnHover?: boolean;
  onItemClick?: (item: Item, index: number) => void;
}

const Masonry: React.FC<MasonryProps> = ({
  items,
  ease = 'expo.out',
  duration = 0.72,
  stagger = 0.05,
  initialDelay = 0,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 1.015,
  blurToFocus = true,
  colorShiftOnHover = false,
  onItemClick
}) => {
  const toTranslate3d = (x: number, y: number) => `translate3d(${x}px, ${y}px, 0)`;
  const columns = useMedia(
    ['(min-width:1500px)', '(min-width:1000px)', '(min-width:600px)', '(min-width:400px)'],
    [5, 4, 3, 2],
    1
  );

  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const [imagesReady, setImagesReady] = useState(false);

  const getInitialPosition = (item: GridItem) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: item.x, y: item.y };

    let direction = animateFrom;
    if (animateFrom === 'random') {
      const dirs = ['top', 'bottom', 'left', 'right'];
      direction = dirs[Math.floor(Math.random() * dirs.length)] as typeof animateFrom;
    }

    switch (direction) {
      case 'top':
        return { x: item.x, y: -200 };
      case 'bottom':
        return { x: item.x, y: window.innerHeight + 200 };
      case 'left':
        return { x: -200, y: item.y };
      case 'right':
        return { x: window.innerWidth + 200, y: item.y };
      case 'center':
        return {
          x: containerRect.width / 2 - item.w / 2,
          y: containerRect.height / 2 - item.h / 2
        };
      default:
        return { x: item.x, y: item.y + 100 };
    }
  };

  useEffect(() => {
    setImagesReady(false);
    preloadImages(items.map(i => i.img)).then(() => setImagesReady(true));
  }, [items]);

  const gridLayout = useMemo<GridLayout>(() => {
    if (!width) return { items: [], height: 0 };
    const colHeights = new Array(columns).fill(0);
    const gap = 16;
    const totalGaps = (columns - 1) * gap;
    const columnWidth = (width - totalGaps) / columns;

    const positionedItems = items.map(child => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = col * (columnWidth + gap);
      const height = child.height;
      const y = colHeights[col];

      colHeights[col] += height + gap;
      return { ...child, x, y, w: columnWidth, h: height };
    });

    const height = Math.max(0, ...colHeights);
    return { items: positionedItems, height };
  }, [columns, items, width]);

  const hasMounted = useRef(false);
  const previousPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  useLayoutEffect(() => {
    if (!imagesReady) return;

    const selectors = gridLayout.items.map(item => `[data-key="${item.id}"]`);
    selectors.forEach(selector => gsap.killTweensOf(selector));

    gridLayout.items.forEach((item, index) => {
      const selector = `[data-key="${item.id}"]`;
      const targetTransform = toTranslate3d(item.x, item.y);

      if (!hasMounted.current) {
        const start = getInitialPosition(item);
        gsap.fromTo(
          selector,
            {
              opacity: 0,
              transform: toTranslate3d(start.x, start.y),
              ...(blurToFocus && { filter: 'blur(6px)' })
          },
            {
              opacity: 1,
              transform: targetTransform,
              ...(blurToFocus && { filter: 'blur(0px)' }),
              duration: 0.82,
              ease: 'expo.out',
              delay: initialDelay + index * stagger
            }
          );
      } else {
        const previousPosition = previousPositionsRef.current[item.id];
        if (
          previousPosition &&
          (previousPosition.x !== item.x || previousPosition.y !== item.y)
        ) {
          gsap.fromTo(
            selector,
            { transform: toTranslate3d(previousPosition.x, previousPosition.y) },
            {
              transform: targetTransform,
              duration,
              ease,
              overwrite: 'auto'
            }
          );
        }
      }
    });

    previousPositionsRef.current = Object.fromEntries(
      gridLayout.items.map(item => [item.id, { x: item.x, y: item.y }])
    );
    hasMounted.current = true;

    return () => {
      selectors.forEach(selector => gsap.killTweensOf(selector));
    };
  }, [gridLayout.items, imagesReady, stagger, initialDelay, animateFrom, blurToFocus, duration, ease]);

  const handleMouseEnter = (id: string, element: HTMLElement) => {
    const card = element.querySelector('.masonry-card') as HTMLElement | null;

    if (scaleOnHover) {
      gsap.to(card ?? `[data-key="${id}"]`, {
        scale: hoverScale,
        y: -1.5,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
    if (card) {
      gsap.to(card, {
        boxShadow: '0 14px 30px -20px rgba(0,0,0,0.6)',
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  };

  const handleMouseLeave = (id: string, element: HTMLElement) => {
    const card = element.querySelector('.masonry-card') as HTMLElement | null;

    if (scaleOnHover) {
      gsap.to(card ?? `[data-key="${id}"]`, {
        scale: 1,
        y: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
    if (card) {
      gsap.to(card, {
        boxShadow: '0 12px 28px -22px rgba(0,0,0,0.55)',
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  };

  const openItemUrl = (url: string) => {
    if (!url || url === 'noop') return;
    window.open(url, '_blank', 'noopener');
  };

  const containerHeight = gridLayout.height;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: containerHeight }}>
      {gridLayout.items.map((item, index) => (
        <div
          key={item.id}
          data-key={item.id}
          className={`absolute box-content ${item.url && item.url !== 'noop' ? 'cursor-pointer' : 'cursor-default'}`}
          style={{
            width: item.w,
            height: item.h,
            transform: toTranslate3d(item.x, item.y),
            willChange: 'transform, opacity'
          }}
          onClick={() => {
            if (onItemClick) {
              onItemClick(item, index);
              return;
            }
            openItemUrl(item.url);
          }}
          onMouseEnter={e => handleMouseEnter(item.id, e.currentTarget)}
          onMouseLeave={e => handleMouseLeave(item.id, e.currentTarget)}
        >
          <div
            className="masonry-card relative h-full w-full overflow-hidden rounded-2xl bg-white/95 ring-1 ring-border/30 shadow-[0_12px_28px_-22px_rgba(0,0,0,0.55)] md:rounded-3xl"
          >
            <img
              src={item.img}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain"
              draggable={false}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Masonry;
