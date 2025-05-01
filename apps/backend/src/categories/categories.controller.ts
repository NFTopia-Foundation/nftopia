import {
     Controller, Post, Body, Get, Param, Put
   } from '@nestjs/common';
import { CategoryService } from './categories.service';
import {  UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
   @Controller('categories')
   export class CategoryController {
     constructor(private readonly service: CategoryService) {}
   
     @Post()
     create(@Body() dto: CreateCategoryDto) {
       return this.service.create(dto);
     }
   
     @Put(':id')
     update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
       return this.service.update(id, dto);
     }
   
     @Get()
     findAll() {
       return this.service.findAll();
     }
   
     @Get(':id')
     findOne(@Param('id') id: string) {
       return this.service.findOne(id);
     }
   }
   