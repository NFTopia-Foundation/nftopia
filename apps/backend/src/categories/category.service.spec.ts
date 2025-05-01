import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

const mockCategory = {
  id: '1',
  name: 'Art',
  description: 'Art NFTs',
  nfts: [],
};

describe('CategoryService', () => {
  let service: CategoryService;
  let repo: Repository<Category>;

  const mockRepo = {
    create: jest.fn().mockImplementation(dto => dto),
    save: jest.fn().mockResolvedValue(mockCategory),
    preload: jest.fn(),
    find: jest.fn().mockResolvedValue([mockCategory]),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repo = module.get<Repository<Category>>(getRepositoryToken(Category));
  });

  it('should create a new category', async () => {
    const dto = { name: 'Art', description: 'Art NFTs' };
    const result = await service.create(dto);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockCategory);
  });

  it('should update a category', async () => {
    mockRepo.preload.mockResolvedValue(mockCategory);
    const dto = { name: 'Updated Name' };
    const result = await service.update('1', dto);
    expect(repo.preload).toHaveBeenCalledWith({ id: '1', ...dto });
    expect(result).toEqual(mockCategory);
  });

  it('should throw NotFoundException if updating non-existent category', async () => {
    mockRepo.preload.mockResolvedValue(null);
    await expect(service.update('invalid', {})).rejects.toThrow(NotFoundException);
  });

  it('should find all categories', async () => {
    const result = await service.findAll();
    expect(result).toEqual([mockCategory]);
  });

  it('should return one category', async () => {
    mockRepo.findOne.mockResolvedValue(mockCategory);
    const result = await service.findOne('1');
    expect(result).toEqual(mockCategory);
  });

  it('should throw NotFoundException for invalid ID on findOne', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
  });
});
