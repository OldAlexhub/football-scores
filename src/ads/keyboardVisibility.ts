import { Keyboard } from 'react-native';

let visible = false;
const listeners = new Set<(visible: boolean) => void>();

export function isKeyboardVisible(): boolean {
  return visible;
}

export function subscribeKeyboardVisible(listener: (visible: boolean) => void): () => void {
  listeners.add(listener);
  listener(visible);
  return () => listeners.delete(listener);
}

let started = false;
export function startKeyboardVisibilityTracking(): void {
  if (started) return;
  started = true;
  Keyboard.addListener('keyboardDidShow', () => {
    visible = true;
    listeners.forEach(l => l(true));
  });
  Keyboard.addListener('keyboardDidHide', () => {
    visible = false;
    listeners.forEach(l => l(false));
  });
}
