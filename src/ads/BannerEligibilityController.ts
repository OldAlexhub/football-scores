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
  private sensitiveCount = 0;
  private listeners = new Set<Listener>();

  suppress(sensitive = true): () => void {
    if(sensitive)this.sensitiveCount++;
    this.suppressionCount += 1;
    this.notify();
    return () => {
      if(sensitive)this.sensitiveCount=Math.max(0,this.sensitiveCount-1);
      this.suppressionCount = Math.max(0, this.suppressionCount - 1);
      this.notify();
    };
  }

  isSensitive(): boolean { return this.sensitiveCount>0; }

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
