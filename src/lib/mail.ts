import nodemailer from "nodemailer";

/**
 * Mailer abstraction: uses SMTP when configured, otherwise logs the message to
 * the server console (dev mode) so flows like password reset remain testable
 * without an email provider.
 */
export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } = process.env;

  if (!SMTP_HOST) {
    console.info(`[mail:dev] To: ${opts.to}\n[mail:dev] Subject: ${opts.subject}\n[mail:dev] ${opts.text}`);
    return { delivered: false as const, devLogged: true as const };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
  });
  await transporter.sendMail({
    from: EMAIL_FROM ?? "InsightHub <no-reply@insighthub.local>",
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  return { delivered: true as const, devLogged: false as const };
}
