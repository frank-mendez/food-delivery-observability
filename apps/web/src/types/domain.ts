export type MoneyValue = string | number;

export type RestaurantStatus = 'OPEN' | 'CLOSED';
export type UserRole =
  | 'CUSTOMER'
  | 'RESTAURANT_OWNER'
  | 'RIDER'
  | 'ADMINISTRATOR';
export type DevelopmentRole = 'customer' | 'restaurant' | 'rider';
export type RiderAvailability = 'OFFLINE' | 'AVAILABLE' | 'BUSY';
export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED'
  | 'EXPIRED';
export type PaymentStatus =
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'RETRYING';
export type DeliveryStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';
export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';
export type PaymentScenario = 'success' | 'failure' | 'timeout';

export type UserSummary = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
};

export type CustomerProfile = {
  id: string;
  userId: string;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAccount = UserSummary & {
  customerProfile?: CustomerProfile | null;
};

export type Restaurant = {
  id: string;
  ownerId?: string | null;
  name: string;
  status: RestaurantStatus;
  createdAt: string;
  updatedAt: string;
  menuItems?: MenuItem[];
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  name: string;
  price: MoneyValue;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  priceSnapshot: MoneyValue;
  menuItem: MenuItem;
};

export type Payment = {
  id: string;
  orderId: string;
  status: PaymentStatus;
  amount: MoneyValue;
  attemptCount: number;
  providerReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Delivery = {
  id: string;
  orderId: string;
  riderId?: string | null;
  status: DeliveryStatus;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: Order;
};

export type Order = {
  id: string;
  restaurantId: string;
  customerId?: string | null;
  riderId?: string | null;
  status: OrderStatus;
  totalAmount: MoneyValue;
  cancelledAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: Restaurant;
  items: OrderItem[];
  payment?: Payment | null;
  delivery?: Delivery | null;
};

export type PopularItem = {
  menuItem: MenuItem;
  quantity: number;
};

export type RiderProfile = {
  id: string;
  userId: string;
  availability: RiderAvailability;
  createdAt: string;
  updatedAt: string;
  user: UserSummary;
};

export type Notification = {
  id: string;
  userId?: string | null;
  orderId?: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  destination: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
};

export type HealthStatus = {
  status: string;
  checks?: Record<string, { status: string }>;
};
