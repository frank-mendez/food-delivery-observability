import { RestaurantDetailScreen } from '@/features/restaurants/components/restaurant-detail-screen';

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  return <RestaurantDetailScreen restaurantId={restaurantId} />;
}
