import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Role } from './roles/entities/role.entity';
import { ServiceType } from './service-type/entities/service-type.entity';
import * as bcrypt from 'bcrypt';

const ROLES = [
  { name: 'CUSTOMER', description: 'العميل — يطلب الخدمات' },
  { name: 'ASSISTANT', description: 'المساعد — ينفذ الخدمات' },
  { name: 'ADMIN', description: 'مدير النظام' },
];

const SERVICES = [
  { code: 'CAR_WASH', name: 'غسيل سيارة', description: 'غسيل وتنظيف السيارة', basePrice: 50 },
  { code: 'SHOPPING', name: 'تسوق', description: 'تسوق وشراء الطلبات', basePrice: 40 },
  { code: 'DELIVERY', name: 'توصيل', description: 'توصيل الطرود والطلبات', basePrice: 30 },
  { code: 'PICKUP', name: 'استلام', description: 'استلام الطرود والوثائق', basePrice: 25 },
  { code: 'WAITING', name: 'انتظار', description: 'الانتظار في الطوابير', basePrice: 35 },
];

export async function seed(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);
  const serviceRepo = dataSource.getRepository(ServiceType);

  for (const r of ROLES) {
    const existing = await roleRepo.findOne({ where: { name: r.name as any } });
    if (!existing) {
      await roleRepo.save(roleRepo.create({ name: r.name as any, description: r.description }));
    }
  }

  for (const s of SERVICES) {
    const existing = await serviceRepo.findOne({ where: { code: s.code } });
    if (!existing) {
      await serviceRepo.save(
        serviceRepo.create({
          code: s.code,
          name: s.name,
          description: s.description,
          basePrice: s.basePrice,
          isActive: true,
        }),
      );
    }
  }

  const adminEmail = 'admin@mashwari.local';
  let admin = await userRepo.findOne({ where: { email: adminEmail }, relations: ['roles', 'roles.role'] });
  if (!admin) {
    const hash = await bcrypt.hash('Admin@123', 10);
    admin = userRepo.create({
      fullName: 'System Admin',
      email: adminEmail,
      phone: '+966500000000',
      passwordHash: hash,
      isActive: true,
      roles: [],
    });
    await userRepo.save(admin);
  }
  const adminRole = await roleRepo.findOne({ where: { name: 'ADMIN' as any } });
  const customerRole = await roleRepo.findOne({ where: { name: 'CUSTOMER' as any } });
  if (adminRole && !admin.roles.some((ur) => ur.roleId === adminRole.id)) {
    admin.roles.push({ userId: admin.id, roleId: adminRole.id, role: adminRole } as any);
  }
  if (customerRole && !admin.roles.some((ur) => ur.roleId === customerRole.id)) {
    admin.roles.push({ userId: admin.id, roleId: customerRole.id, role: customerRole } as any);
  }
  await userRepo.save(admin);

  console.log('Roles, services, and admin user seeded.');
}
