import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SepayQrData {
  qrUrl: string;
  accountNo: string;
  bankCode: string;
  accountName: string;
  amount: number;
  transferCode: string;
  description: string;
}

@Injectable()
export class PaymentGatewayService {
  constructor(private readonly configService: ConfigService) {}

  makeTransferCode(orderId: number): string {
    const prefix = this.configService.get<string>('SEPAY_PREFIX', 'SHOP');
    return `${prefix}${orderId}`;
  }

  generateSepayQR(orderId: number, amount: number): SepayQrData {
    const accountNo = this.configService.get<string>('SEPAY_ACCOUNT_NO', '');
    const bankCode = this.configService.get<string>('SEPAY_BANK_CODE', 'MB');
    const accountName = this.configService.get<string>('SEPAY_ACCOUNT_NAME', '');
    const transferCode = this.makeTransferCode(orderId);

    const qrUrl =
      `https://qr.sepay.vn/img` +
      `?acc=${accountNo}` +
      `&bank=${bankCode}` +
      `&amount=${amount}` +
      `&des=${encodeURIComponent(transferCode)}` +
      `&template=compact`;

    return {
      qrUrl,
      accountNo,
      bankCode,
      accountName,
      amount,
      transferCode,
      description: `Nội dung chuyển khoản: ${transferCode}`,
    };
  }

  verifySepayWebhook(authorization: string): boolean {
    const secret = this.configService.get<string>('SEPAY_WEBHOOK_SECRET', '');
    if (!secret) return false;
    return authorization === `Apikey ${secret}`;
  }
}
