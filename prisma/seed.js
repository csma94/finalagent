const { PrismaClient } = require('@prisma/client');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seeding...');

  // Note: User authentication is now handled by Clerk
  // No need to create users with passwords in the database
  // Users will be created automatically when they sign up through Clerk

  logger.info('🎉 Database seeding completed successfully!');
  logger.info('\n📋 Summary:');
  logger.info('- Authentication: Handled by Clerk');
  logger.info('- Users: Created automatically through Clerk sign-up');
  logger.info('\n⚠️  IMPORTANT: Configure Clerk authentication in your environment variables!');
}

main()
  .catch((e) => {
    logger.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
