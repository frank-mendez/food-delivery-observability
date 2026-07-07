const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, RestaurantStatus } = require('@prisma/client');

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

  for (const restaurantSeed of restaurants) {
    const restaurant = await prisma.restaurant.upsert({
      where: { name: restaurantSeed.name },
      update: { status: restaurantSeed.status },
      create: {
        name: restaurantSeed.name,
        status: restaurantSeed.status,
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

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
