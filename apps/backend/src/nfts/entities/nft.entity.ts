import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Collection } from '../../collections/entities/collection.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity()
export class NFT {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tokenId: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  imageUrl: string; // CDN/Firebase image

  @Column({ nullable: true })
  ipfsUrl: string; // NFT.Storage metadata URL

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  price: number;

  @Column({ default: 'STK' })
  currency: string;

  @ManyToOne(() => User, user => user.nfts)
  owner: User;

  @ManyToOne(() => Collection, collection => collection.nfts)
  collection: Collection;

  @ManyToOne(() => Category, (category) => category.nfts, { nullable: false }) // Many NFTs can belong to one Category
  category: Category;

  @Column({ default: false })
  isListed: boolean;
}
