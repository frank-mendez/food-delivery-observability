import type {
  MenuItem,
  Order,
  PopularItem,
  Restaurant,
  RestaurantStatus,
} from '@/types/domain';
import { apiFetch } from '../client';

export type CreateMenuItemPayload = {
  name: string;
  price: number;
  isAvailable?: boolean;
};

export type UpdateMenuItemPayload = Partial<CreateMenuItemPayload>;

export const restaurantsRepository = {
  list() {
    return apiFetch<Restaurant[]>('/restaurants');
  },
  detail(restaurantId: string) {
    return apiFetch<Restaurant>(`/restaurants/${restaurantId}`);
  },
  menu(restaurantId: string) {
    return apiFetch<MenuItem[]>(`/restaurants/${restaurantId}/menu`);
  },
  popularItems(restaurantId?: string) {
    const query = restaurantId ? `?restaurantId=${restaurantId}` : '';

    return apiFetch<PopularItem[]>(`/restaurants/popular-items${query}`);
  },
  orders(restaurantId: string, token: string) {
    return apiFetch<Order[]>(`/restaurants/${restaurantId}/orders`, { token });
  },
  updateRestaurant(
    restaurantId: string,
    token: string,
    payload: { name?: string },
  ) {
    return apiFetch<Restaurant>(`/restaurants/${restaurantId}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  updateStatus(
    restaurantId: string,
    token: string,
    status: RestaurantStatus,
  ) {
    return apiFetch<Restaurant>(`/restaurants/${restaurantId}/status`, {
      method: 'PATCH',
      token,
      body: { status },
    });
  },
  createMenuItem(
    restaurantId: string,
    token: string,
    payload: CreateMenuItemPayload,
  ) {
    return apiFetch<MenuItem>(`/restaurants/${restaurantId}/menu-items`, {
      method: 'POST',
      token,
      body: payload,
    });
  },
  updateMenuItem(
    restaurantId: string,
    menuItemId: string,
    token: string,
    payload: UpdateMenuItemPayload,
  ) {
    return apiFetch<MenuItem>(
      `/restaurants/${restaurantId}/menu-items/${menuItemId}`,
      {
        method: 'PATCH',
        token,
        body: payload,
      },
    );
  },
  disableMenuItem(restaurantId: string, menuItemId: string, token: string) {
    return apiFetch<MenuItem>(
      `/restaurants/${restaurantId}/menu-items/${menuItemId}`,
      {
        method: 'DELETE',
        token,
      },
    );
  },
  transitionOrder(
    restaurantId: string,
    orderId: string,
    action: 'accept' | 'reject' | 'preparing' | 'ready',
    token: string,
  ) {
    return apiFetch<Order>(
      `/restaurants/${restaurantId}/orders/${orderId}/${action}`,
      {
        method: 'PATCH',
        token,
      },
    );
  },
};
