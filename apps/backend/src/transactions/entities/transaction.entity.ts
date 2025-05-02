import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NFT } from '../../nfts/entities/nft.entity';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  buyer: User;

  @ManyToOne(() => User)
  seller: User;

  @ManyToOne(() => NFT)
  nft: NFT;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  ipfsMetadataHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  transactionHash: string;
}
