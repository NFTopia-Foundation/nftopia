import {
  Controller,
  Post,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { NftsService } from './nfts.service';
import { MintNftDto } from './dto/mint-nft.dto';

@Controller('nfts')
export class NftsController {
  constructor(private readonly nftService: NftsService) {}

  @Post('mint/:userId/:collectionId')
  @UseInterceptors(FileInterceptor('file'))
  async mint(
    @Param('userId') userId: string,
    @Param('collectionId') collectionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: MintNftDto,
  ) {
    return this.nftService.mintNft(
      file,
      file.buffer,
      file.originalname,
      body,
      userId,
      collectionId,
    );
  }
}
