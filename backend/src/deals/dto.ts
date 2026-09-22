import { SellerType } from '@prisma/client';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDealDto {
  @IsEnum(SellerType)
  sellerType!: SellerType;

  @IsString()
  clientName!: string;

  @IsOptional() @IsString()
  clientPhone?: string;

  @IsOptional() @IsString()
  contactName?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  deliveryAddresses?: string[];

  @IsOptional() @IsString()
  leadSource?: string;

  @IsString()
  requestMode!: 'TEXT' | 'INCOMING_INVOICE';

  @IsOptional() @IsString()
  requestText?: string;

  @IsOptional() @IsString()
  marginMode?: string;

  @IsOptional() @IsNumber()
  marginValue?: number;

  @IsOptional() @IsString()
  accountingComment?: string;

  @IsOptional() @IsString()
  managerComment?: string;

  @IsString()
  managerId!: string;

  @IsString()
  createdById!: string;

  @IsOptional()
  urgent?: boolean;

  @IsOptional()
  deferInvoiceTask?: boolean;
}
