export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  /** When set and greater than `price`, the storefront shows it as strike-through with a discount badge. */
  originalPrice?: number;
  /** Primary category name (for backward compatibility with older docs). */
  category: string;
  /** All categories this product belongs to. New products always have this set. */
  categories?: string[];
  image: string;
  color?: string;
  inStock: boolean;
  /** Optional explicit stock quantity. When undefined we fall back to `inStock`. */
  stockQuantity?: number;
  /** Featured flag — shown on the homepage "Featured" row. */
  featured?: boolean;
  /** Average rating computed from reviews (0-5). Maintained server-side. */
  rating?: number;
  /** Total number of reviews. */
  reviewCount?: number;
  createdAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  items: CartItem[];
  total: number;
  /** Discount amount applied via coupon. */
  discountAmount?: number;
  /** Coupon code applied to the order. */
  couponCode?: string;
  paymentMethod: 'cod' | 'instapay';
  paymentStatus: 'pending' | 'confirmed' | 'rejected';
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: ShippingAddress;
  instapayReference?: string;
  /** When true, the order is hidden from every admin-facing page but still visible to the customer. */
  hiddenFromAdmin?: boolean;
  createdAt: Date;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  governorate: string;
}

export interface SavedAddress extends ShippingAddress {
  id: string;
  label: string;
  isDefault?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  /** Saved shipping addresses (multi-address). */
  addresses?: SavedAddress[];
  createdAt: Date;
}

export interface Coupon {
  id: string;
  code: string;
  /** 'percent' = X% off, 'flat' = X EGP off. */
  type: 'percent' | 'flat';
  value: number;
  /** Minimum order subtotal (EGP) required for the coupon to apply. 0 = no minimum. */
  minOrder: number;
  /** Total times this coupon may be redeemed across all users. 0 = unlimited. */
  maxUses: number;
  /** How many times the coupon has been redeemed. */
  uses: number;
  /** ISO date string after which the coupon stops working. Empty = no expiry. */
  expiresAt?: string;
  /** Whether the coupon is currently active. */
  active: boolean;
  createdAt?: Date;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: Date;
}
