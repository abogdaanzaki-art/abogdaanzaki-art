import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceType } from './entities/service-type.entity';
import { CreateServiceTypeDto, UpdateServiceTypeDto } from './dto/service-type.dto';

@Injectable()
export class ServiceTypeService {
  constructor(@InjectRepository(ServiceType) private repo: Repository<ServiceType>) {}

  findAll() {
    return this.repo.find();
  }

  findAllActive() {
    return this.repo.find({ where: { isActive: true } });
  }

  async findOne(id: number) {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Service type not found');
    return s;
  }

  create(dto: CreateServiceTypeDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateServiceTypeDto) {
    const s = await this.findOne(id);
    Object.assign(s, dto);
    return this.repo.save(s);
  }

  async toggle(id: number, isActive: boolean) {
    const s = await this.findOne(id);
    s.isActive = isActive;
    return this.repo.save(s);
  }
}
