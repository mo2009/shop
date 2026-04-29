export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'nfc-card' | 'digital-service';
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
