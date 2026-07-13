const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
const {
  PrismaClient,
  RestaurantStatus,
  RiderAvailability,
  UserRole,
} = require('@prisma/client');

const restaurants = [
  {
    name: 'Northstar Burgers',
    status: RestaurantStatus.OPEN,
    menuItems: [
      { name: 'Classic Cheeseburger', price: '11.50' },
      { name: 'Crispy Chicken Sandwich', price: '10.75' },
      { name: 'Loaded Fries', price: '6.25' },
    ],
  },
  {
    name: 'Green Bowl Kitchen',
    status: RestaurantStatus.OPEN,
    menuItems: [
      { name: 'Harvest Grain Bowl', price: '12.25' },
      { name: 'Avocado Power Salad', price: '11.00' },
      { name: 'Ginger Lime Smoothie', price: '5.50' },
    ],
  },
  {
    name: 'Pasta Sprint',
    status: RestaurantStatus.OPEN,
    menuItems: [
      { name: 'Spaghetti Pomodoro', price: '13.00' },
      { name: 'Creamy Pesto Penne', price: '14.25' },
      { name: 'Garlic Focaccia', price: '4.75' },
    ],
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed the database');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash,
      name: 'Local Admin',
      role: UserRole.ADMINISTRATOR,
    },
    create: {
      email: 'admin@example.com',
      passwordHash,
      name: 'Local Admin',
      role: UserRole.ADMINISTRATOR,
    },
  });
  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {
      passwordHash,
      name: 'Restaurant Owner',
      role: UserRole.RESTAURANT_OWNER,
    },
    create: {
      email: 'owner@example.com',
      passwordHash,
      name: 'Restaurant Owner',
      role: UserRole.RESTAURANT_OWNER,
    },
  });
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {
      passwordHash,
      name: 'Demo Customer',
      phone: '+15550101010',
      role: UserRole.CUSTOMER,
    },
    create: {
      email: 'customer@example.com',
      passwordHash,
      name: 'Demo Customer',
      phone: '+15550101010',
      role: UserRole.CUSTOMER,
      customerProfile: {
        create: {
          address: '100 Local Test Ave',
        },
      },
    },
  });
  await prisma.customerProfile.upsert({
    where: { userId: customer.id },
    update: { address: '100 Local Test Ave' },
    create: { userId: customer.id, address: '100 Local Test Ave' },
  });
  const rider = await prisma.user.upsert({
    where: { email: 'rider@example.com' },
    update: {
      passwordHash,
      name: 'Demo Rider',
      phone: '+15550202020',
      role: UserRole.RIDER,
    },
    create: {
      email: 'rider@example.com',
      passwordHash,
      name: 'Demo Rider',
      phone: '+15550202020',
      role: UserRole.RIDER,
      riderProfile: {
        create: {
          availability: RiderAvailability.AVAILABLE,
        },
      },
    },
  });
  await prisma.riderProfile.upsert({
    where: { userId: rider.id },
    update: { availability: RiderAvailability.AVAILABLE },
    create: {
      userId: rider.id,
      availability: RiderAvailability.AVAILABLE,
    },
  });

  for (const restaurantSeed of restaurants) {
    const restaurant = await prisma.restaurant.upsert({
      where: { name: restaurantSeed.name },
      update: { status: restaurantSeed.status, ownerId: owner.id },
      create: {
        name: restaurantSeed.name,
        status: restaurantSeed.status,
        ownerId: owner.id,
      },
    });

    for (const menuItem of restaurantSeed.menuItems) {
      await prisma.menuItem.upsert({
        where: {
          restaurantId_name: {
            restaurantId: restaurant.id,
            name: menuItem.name,
          },
        },
        update: {
          price: menuItem.price,
          isAvailable: true,
        },
        create: {
          restaurantId: restaurant.id,
          name: menuItem.name,
          price: menuItem.price,
          isAvailable: true,
        },
      });
    }
  }

  await prisma.domainEvent.create({
    data: {
      aggregateType: 'seed',
      aggregateId: admin.id,
      type: 'seed.phase3.completed',
      payload: {
        users: ['admin@example.com', 'owner@example.com', 'customer@example.com', 'rider@example.com'],
      },
    },
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
