import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get<string>(
      'mail.from',
      'noreply@example.com',
    );
    this.fromName = this.configService.get<string>(
      'mail.fromName',
      'Smart Laptop Store',
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3002',
    );

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject: 'Xác thực email - Smart Laptop Store',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Xác thực email của bạn</h2>
            <p>Chào bạn,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại Smart Laptop Store.</p>
            <p>Vui lòng nhấn vào nút bên dưới để xác thực email:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}"
                 style="background-color: #2563eb; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Xác thực email
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Link xác thực sẽ hết hạn sau 24 giờ.<br/>
              Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.
            </p>
          </div>
        `,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  async sendNewNotificationEmail(
    email: string,
    title: string,
    message: string,
    type: string,
  ): Promise<void> {
    const typeLabels: Record<string, string> = {
      order: 'Đơn hàng',
      promotion: 'Khuyến mãi',
      system: 'Hệ thống',
      review: 'Đánh giá',
      warranty: 'Bảo hành',
      payment: 'Thanh toán',
      wishlist: 'Yêu thích',
      staff: 'Nhân viên',
      inventory: 'Kho hàng',
      return: 'Đổi trả',
    };
    const typeLabel = typeLabels[type] || 'Thông báo';

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject: `${typeLabel} - ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${title}</h2>
            <p>${message}</p>
            <p style="color: #6b7280; font-size: 12px;">
              Bạn nhận được thông báo này vì đã bật thông báo email.
            </p>
          </div>
        `,
      });
      this.logger.log(`Notification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send notification email to ${email}`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject: 'Đặt lại mật khẩu - Smart Laptop Store',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Đặt lại mật khẩu</h2>
            <p>Chào bạn,</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản tại Smart Laptop Store.</p>
            <p>Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #dc2626; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Đặt lại mật khẩu
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Link đặt lại mật khẩu sẽ hết hạn sau 1 giờ.<br/>
              Nếu bạn không yêu cầu, vui lòng bỏ qua email này.
            </p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      throw error;
    }
  }
}
