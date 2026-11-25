import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressService {
  constructor(@InjectRepository(Address) private repo: Repository<Address>) {}

  create(userId: number, dto: CreateAddressDto) {
    return this.repo.save(this.repo.create({ ...dto, userId }));
  }

  findByUser(userId: number) {
    return this.repo.find({ where: { userId } });
  }

  async findOneOwned(id: number, userId: number) {
    const addr = await this.repo.findOne({ where: { id } });
    if (!addr) throw new NotFoundException('Address not found');
    if (addr.userId !== userId) throw new ForbiddenException('Not your address');
    return addr;
  }

  async update(id: number, userId: number, dto: UpdateAddressDto) {
    const addr = await this.findOneOwned(id, userId);
    Object.assign(addr, dto);
    return this.repo.save(addr);
  }

  async remove(id: number, userId: number) {
    const addr = await this.findOneOwned(id, userId);
    await this.repo.remove(addr);
    return { deleted: true };
  }
}
