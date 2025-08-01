import {
  Controller,
  Post,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  HttpException,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { NftsService } from './nfts.service';
import { MintNftDto } from './dto/mint-nft.dto';
import { NftStorageService } from '../nftstorage/nftstorage.service';
import { Logger } from '@nestjs/common';
import { CreateNftFromUrlDto, MintNftDto } from './dto/mint-nft.dto';
import { User } from 'src/users/entities/user.entity';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RequestWithUser } from 'src/types/RequestWithUser';

@Controller('nfts')
export class NftsController {
  private readonly logger = new Logger(NftsController.name);

  constructor(
    private readonly nftService: NftsService,
    private readonly nftStorageService: NftStorageService,
  ) {}

  @Post('mint/:userId/:collectionId')
  @UseInterceptors(FileInterceptor('file'))
  async mint(
    @Param('userId') userId: string,
    @Param('collectionId') collectionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: MintNftDto,
  ) {
    // Request logging
    this.logger.log(
      `Mint request received - User: ${userId}, Collection: ${collectionId}, File: ${file?.originalname}`,
    );

    try {
      // Basic request validation
      if (!file) {
        throw new HttpException(
          'No file uploaded',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check NFT Storage service health
      if (!(await this.nftStorageService.checkHealth())) {
        throw new HttpException(
          'NFT storage service unavailable - invalid or malformed API key',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const result = await this.nftService.mintNft(
        file,
        file.buffer,
        file.originalname,
        body,
        userId,
        collectionId,
      );

      this.logger.log(
        `NFT minted successfully - User: ${userId}, Collection: ${collectionId}`,
      );
      return result;

    } catch (error) {
      this.logger.error(
        `Mint failed - User: ${userId}, Collection: ${collectionId}`,
        error.stack,
      );

      // Handle known error types with specific responses
      if (error instanceof HttpException) {
        throw error;
      }

      // Categorize different error types
      if (error.message.includes('API key') || error.message.includes('malformed')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Invalid NFT storage configuration',
            error: 'Bad Request',
            details: 'The NFT storage API key is invalid or malformed',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Default internal server error
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'NFT minting failed',
          error: 'Internal Server Error',
          details: 'An unexpected error occurred during minting',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

  @UseGuards(JwtAuthGuard)
  @Post('mint/from-url')
  async mintFromUrl(
    @Body() dto: CreateNftFromUrlDto,
    @Req() req: RequestWithUser,
    @Query('collectionId') collectionId: string
  ) {
    return this.nftService.mintNftFromUrl(dto, req.user.sub, collectionId);
  }

}
