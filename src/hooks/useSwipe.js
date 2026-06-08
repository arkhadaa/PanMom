import { useRef } from 'react';

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }) {
  const touchStart = useRef({ x: null, y: null });

  const onTouchStart = (e) => {
    touchStart.current = {
      x: e.changedTouches[0].screenX,
      y: e.changedTouches[0].screenY
    };
  };

  const onTouchEnd = (e) => {
    if (touchStart.current.x === null) return;
    
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const distanceX = touchStart.current.x - touchEndX;
    const distanceY = touchStart.current.y - touchEndY;

    // Solo evaluar si el movimiento fue predominantemente horizontal
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (distanceX > threshold && onSwipeLeft) {
        onSwipeLeft();
      } else if (distanceX < -threshold && onSwipeRight) {
        onSwipeRight();
      }
    }

    touchStart.current = { x: null, y: null };
  };

  return {
    onTouchStart,
    onTouchEnd
  };
}
