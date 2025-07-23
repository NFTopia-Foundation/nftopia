import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { FraudRiskLevel } from '../dto/fraud-check-result.dto';

@Entity()
export class FraudCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Transaction)
  transaction: Transaction;

  @ManyToOne(() => User)
  user: User;

  @Column({ type: 'enum', enum: FraudRiskLevel })
  riskLevel: FraudRiskLevel;

  @Column()
  isSuspicious: boolean;

  @Column({ type: 'json' })
  triggeredRules: string[];

  @Column()
  recommendation: 'ALLOW' | 'REVIEW' | 'BLOCK';

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  confidence: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}