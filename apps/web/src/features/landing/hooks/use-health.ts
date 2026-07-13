'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { healthRepository } from '@/lib/api/repositories/health';

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthRepository.current(),
    refetchInterval: 30_000,
  });
}
