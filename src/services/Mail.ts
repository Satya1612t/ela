import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

class MailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendToSingleUser(
    to: string,
    subject: string,
    text: string,
    html?: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        text,
        html,
      });
      console.log(`Mail sent to ${to}`);
    } catch (error) {
      console.error(`Error sending mail to ${to}:`, error);
    }
  }

  async sendToMultipleUsers(
    recipients: string[],
    subject: string,
    text: string,
    html?: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: recipients.join(","),
        subject,
        text,
        html,
      });
      console.log(`Mail sent to multiple users: ${recipients.join(", ")}`);
    } catch (error) {
      console.error("Error sending mail to multiple users:", error);
    }
  }
}

export default new MailService();
