import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto,} from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create(dto);
    return await this.categoryRepo.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.preload({ id: Number(id), ...dto });
    if (!category) throw new NotFoundException('Category not found');
    return this.categoryRepo.save(category);
  }

  async findAll() {
    return this.categoryRepo.find({ relations: ['nfts'] });
  }

  async findOne(id: string) {
    const category = await this.categoryRepo.findOne({
      where: { id: Number(id) },
      relations: ['nfts'],
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
