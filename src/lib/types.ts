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
  paymentMethod: 'cod' | 'instapay';
  paymentStatus: 'pending' | 'confirmed' | 'rejected';
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: ShippingAddress;
  instapayReference?: string;
  createdAt: Date;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  governorate: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: Date;
}
