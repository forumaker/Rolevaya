export class CarouselController {
  index = 0;
  visibleCount = 3;

  private touchStartX: number | null = null;
  private touchCurrentX: number | null = null;
  private readonly swipeThreshold = 40;

  updateVisibleCount() {
    if (typeof window === 'undefined') {
      this.visibleCount = 3;
      return;
    }

    this.visibleCount = window.innerWidth <= 768 ? 1 : 3;
  }

  clamp(rowCount: number) {
    if (!rowCount) {
      this.index = 0;
      return;
    }

    const max = Math.max(0, rowCount - this.visibleCount);
    if (this.index > max) this.index = 0;
    if (this.index < 0) this.index = 0;
  }

  prev(rowCount: number) {
    if (rowCount <= this.visibleCount) return;

    const max = Math.max(0, rowCount - this.visibleCount);
    this.index = this.index <= 0 ? max : this.index - 1;
  }

  next(rowCount: number) {
    if (rowCount <= this.visibleCount) return;

    const max = Math.max(0, rowCount - this.visibleCount);
    this.index = this.index >= max ? 0 : this.index + 1;
  }

  handleTouchStart = (event: TouchEvent) => {
    if (!event.touches || !event.touches.length) return;

    this.touchStartX = event.touches[0].clientX;
    this.touchCurrentX = this.touchStartX;
  };

  handleTouchMove = (event: TouchEvent) => {
    if (!event.touches || !event.touches.length) return;
    this.touchCurrentX = event.touches[0].clientX;
  };

  resolveTouchEnd(): 'prev' | 'next' | null {
    if (this.touchStartX === null || this.touchCurrentX === null) {
      this.touchStartX = null;
      this.touchCurrentX = null;
      return null;
    }

    const deltaX = this.touchCurrentX - this.touchStartX;
    this.touchStartX = null;
    this.touchCurrentX = null;

    if (Math.abs(deltaX) < this.swipeThreshold) return null;

    return deltaX < 0 ? 'next' : 'prev';
  }
}
