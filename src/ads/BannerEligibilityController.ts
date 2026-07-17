type Listener = (hidden: boolean) => void;

/**
 * Any mounted screen that must never show the persistent banner (Prediction
 * Editor, Reminder Editor, Export Preview, destructive confirmations, …)
 * calls useSuppressBanner() for as long as it is mounted. The banner slot
 * subscribes and hides itself while the suppression count is above zero,
 * independent of which tab or stack is currently focused.
 */
class BannerEligibilityController {
  private suppressionCount = 0;
  private listeners = new Set<Listener>();

  suppress(): () => void {
    this.suppressionCount += 1;
    this.notify();
    return () => {
      this.suppressionCount = Math.max(0, this.suppressionCount - 1);
      this.notify();
    };
  }

  isHidden(): boolean {
    return this.suppressionCount > 0;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.isHidden());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const hidden = this.isHidden();
    this.listeners.forEach(l => l(hidden));
  }
}

export const bannerEligibilityController = new BannerEligibilityController();
