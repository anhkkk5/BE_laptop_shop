import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsArray,
  Min,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';
import { ReturnReason, RefundMethod } from '../enums/return.enum.js';

export class SubmitReturnDto {
  @IsNumber()
  orderId!: number;

  @IsString()
  @IsIn(Object.values(ReturnReason))
  returnReason!: ReturnReason;

  @IsOptional()
  @IsString()
  @MinLength(10)
  returnDescription?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  evidencePhotos?: string[];
}

export class ReviewReturnDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MinLength(20)
  rejectionReason?: string;
}

export class SelectRefundMethodDto {
  @IsString()
  @IsIn(Object.values(RefundMethod))
  refundMethod!: RefundMethod;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankHolder?: string;
}

export class InspectReturnDto {
  @IsString()
  @IsIn(['perfect', 'minor_damage', 'significant_damage', 'missing_items'])
  condition!: string;

  @IsString()
  @IsIn(['full_refund', 'partial_refund', 'no_refund'])
  refundType!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductionAmount?: number;

  @IsOptional()
  @IsString()
  @MinLength(20)
  deductionReason?: string;

  @IsString()
  @MinLength(20)
  inspectionNotes!: string;

  @IsOptional()
  @IsArray()
  inspectionPhotos?: string[];

  @IsOptional()
  isFraud?: boolean;
}

export class AddInternalNoteDto {
  @IsString()
  @MinLength(1)
  note!: string;
}
