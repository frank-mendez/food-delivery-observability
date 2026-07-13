import { OrderDetailScreen } from '@/features/orders/components/order-detail-screen';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return <OrderDetailScreen orderId={orderId} />;
}
