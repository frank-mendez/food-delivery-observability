'use client';

import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { CardGridSkeleton } from '@/components/shared/skeleton';
import { SearchInput } from '@/components/shared/search-input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useFilterStore } from '@/stores/filter-store';
import { RestaurantCard } from './restaurant-card';
import { useRestaurants } from '../hooks/use-restaurants';

export function RestaurantsScreen() {
  const restaurantsQuery = useRestaurants();
  const filters = useFilterStore((state) => state.restaurants);
  const setRestaurantSearch = useFilterStore(
    (state) => state.setRestaurantSearch,
  );
  const setRestaurantStatus = useFilterStore(
    (state) => state.setRestaurantStatus,
  );
  const clearRestaurantFilters = useFilterStore(
    (state) => state.clearRestaurantFilters,
  );
  const restaurants = (restaurantsQuery.data ?? []).filter((restaurant) => {
    const matchesSearch = restaurant.name
      .toLowerCase()
      .includes(filters.search.toLowerCase());
    const matchesStatus =
      filters.status === 'ALL' || restaurant.status === filters.status;

    return matchesSearch && matchesStatus;
  });

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Customer"
        title="Restaurants"
        description="Browse the seeded kitchens and add menu items to the cart."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void restaurantsQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <SearchInput
          aria-label="Search restaurants"
          placeholder="Search restaurants"
          value={filters.search}
          onChange={(event) => setRestaurantSearch(event.target.value)}
        />
        <Select
          aria-label="Filter by restaurant status"
          value={filters.status}
          onChange={(event) =>
            setRestaurantStatus(event.target.value as typeof filters.status)
          }
        >
          <option value="ALL">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </Select>
        <Button type="button" variant="outline" onClick={clearRestaurantFilters}>
          Clear
        </Button>
      </div>

      {restaurantsQuery.isPending ? <CardGridSkeleton /> : null}
      {restaurantsQuery.isError ? (
        <ErrorState
          error={restaurantsQuery.error}
          onRetry={() => void restaurantsQuery.refetch()}
        />
      ) : null}
      {!restaurantsQuery.isPending && restaurants.length === 0 ? (
        <EmptyState
          title="No restaurants match"
          description="Adjust the search or status filter to reopen the list."
          actionLabel="Clear filters"
          onAction={clearRestaurantFilters}
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {restaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>
    </section>
  );
}
