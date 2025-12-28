export type CartItem = {
  id: string;
  name: string;
  priceCents: number;
  image: string;
  quantity: number;
};

const CART_KEY = 'pizza42_cart_v1';
const CART_EVENT = 'pizza42-cart-changed';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readCart(): CartItem[] {
  const parsed = safeParse<unknown>(localStorage.getItem(CART_KEY));
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as Partial<CartItem>)
    .filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.priceCents === 'number' &&
        typeof item.image === 'string' &&
        typeof item.quantity === 'number',
    )
    .map((item) => ({
      id: item.id as string,
      name: item.name as string,
      priceCents: item.priceCents as number,
      image: item.image as string,
      quantity: Math.max(1, Math.floor(item.quantity as number)),
    }));
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function onCartChanged(listener: () => void) {
  const onCustom = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_KEY) listener();
  };

  window.addEventListener(CART_EVENT, onCustom);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(CART_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

export function getCartCount(items: CartItem[] = readCart()) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotalCents(items: CartItem[] = readCart()) {
  return items.reduce((sum, item) => sum + item.quantity * item.priceCents, 0);
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1) {
  const items = readCart();
  const nextQuantity = Math.max(1, Math.floor(quantity));
  const index = items.findIndex((existing) => existing.id === item.id);

  if (index >= 0) {
    const existing = items[index];
    items[index] = { ...existing, quantity: existing.quantity + nextQuantity };
  } else {
    items.push({ ...item, quantity: nextQuantity });
  }

  writeCart(items);
}

export function setItemQuantity(id: string, quantity: number) {
  const items = readCart();
  const nextQuantity = Math.max(0, Math.floor(quantity));
  const nextItems =
    nextQuantity === 0
      ? items.filter((item) => item.id !== id)
      : items.map((item) =>
          item.id === id ? { ...item, quantity: nextQuantity } : item,
        );

  writeCart(nextItems);
}

export function clearCart() {
  writeCart([]);
}

