const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    take: 5,
    select: {
      id: true,
      name: true,
      images: { select: { url: true }, take: 5 }
    }
  });

  console.log('Products with images:');
  products.forEach(p => {
    console.log(`\n${p.name}: ${p.images.length} image(s)`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
