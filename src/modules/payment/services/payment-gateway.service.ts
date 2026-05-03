import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import crypto from 'crypto';
import { firstValueFrom } from 'rxjs';

export interface VietQrData {
  qrUrl: string;
  bankId: string;
  accountNo: string;
  amount: number;
  description: string;
}

export interface MomoPaymentResponse {
  payUrl?: string;
  qrCodeUrl?: string;
  deeplink?: string;
  orderId: string;
  requestId: string;
  resultCode: number;
  message: string;
}

@Injectable()
export class PaymentGatewayService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  generateVietQR(amount: number, description: string): VietQrData {
    const bankId = this.configService.get<string>('VIETQR_BANK_ID', '970422');
    const accountNo = this.configService.get<string>('VIETQR_ACCOUNT_NO', '');
    const accountName = this.configService.get<string>('VIETQR_ACCOUNT_NAME', '');
    const template = this.configService.get<string>('VIETQR_TEMPLATE', 'compact2');

    const encodedDesc = encodeURIComponent(description);
    const encodedName = encodeURIComponent(accountName);

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodedDesc}&accountName=${encodedName}`;

    return {
      qrUrl,
      bankId,
      accountNo,
      amount,
      description,
    };
  }

  async createMomoPayment(
    orderId: number,
    amount: number,
    orderInfo: string,
  ): Promise<MomoPaymentResponse> {
    const partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE', '');
    const accessKey = this.configService.get<string>('MOMO_ACCESS_KEY', '');
    const secretKey = this.configService.get<string>('MOMO_SECRET_KEY', '');
    const endpoint = this.configService.get<string>('MOMO_ENDPOINT', '');
    const returnUrl = this.configService.get<string>('MOMO_RETURN_URL', '');
    const notifyUrl = this.configService.get<string>('MOMO_NOTIFY_URL', '');

    if (!partnerCode || !secretKey) {
      return {
        orderId: String(orderId),
        requestId: String(orderId),
        resultCode: -1,
        message: 'MoMo credentials not configured',
      };
    }

    const requestId = `${orderId}_${Date.now()}`;
    const momoOrderId = `ORD${orderId}_${Date.now()}`;
    const requestType = 'payWithMethod';
    const extraData = '';

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${notifyUrl}&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const body = {
      partnerCode,
      partnerName: 'Smart Laptop Store',
      storeId: partnerCode,
      requestId,
      amount,
      orderId: momoOrderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      lang: 'vi',
      requestType,
      autoCapture: true,
      extraData,
      signature,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(endpoint, body, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      return data as MomoPaymentResponse;
    } catch {
      return {
        orderId: momoOrderId,
        requestId,
        resultCode: -1,
        message: 'Failed to call MoMo API',
      };
    }
  }

  verifyMomoSignature(
    data: Record<string, string | number>,
    receivedSignature: string,
  ): boolean {
    const secretKey = this.configService.get<string>('MOMO_SECRET_KEY', '');
    if (!secretKey) return false;

    const signatureKeys = [
      'accessKey',
      'amount',
      'extraData',
      'message',
      'orderId',
      'orderInfo',
      'orderType',
      'partnerCode',
      'payType',
      'requestId',
      'responseTime',
      'resultCode',
      'transId',
    ];

    const raw = signatureKeys
      .map((k) => `${k}=${data[k] ?? ''}`)
      .join('&');

    const expected = crypto
      .createHmac('sha256', secretKey)
      .update(raw)
      .digest('hex');

    return expected === receivedSignature;
  }
}
