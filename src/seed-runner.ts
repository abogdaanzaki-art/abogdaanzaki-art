import { AppDataSource } from './data-source';
import { seed } from './seed';

AppDataSource.initialize()
  .then(async () => {
    await seed(AppDataSource);
    await AppDataSource.destroy();
    console.log('Seeding complete.');
  })
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
