import nodemailer from 'nodemailer';

function requireMailEnv(name: 'SMTP_HOST' | 'SMTP_USER' | 'SMTP_PASS' | 'SMTP_FROM') {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

function getAppUrl() {
    const appUrl = process.env.APP_URL?.trim();
    if (!appUrl) throw new Error('Missing required environment variable: APP_URL');
    return appUrl.replace(/\/$/, '');
}

function createTransport() {
    const port = Number(process.env.SMTP_PORT ?? 587);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error('SMTP_PORT must be a valid port number');
    }

    return nodemailer.createTransport({
        host: requireMailEnv('SMTP_HOST'),
        port,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: requireMailEnv('SMTP_USER'),
            pass: requireMailEnv('SMTP_PASS'),
        },
    });
}

export async function sendActivationEmail(input: {
    email: string;
    companyName: string;
    token: string;
    expiresAt: Date;
}) {
    const activationUrl = `${getAppUrl()}/activate?token=${encodeURIComponent(input.token)}`;
    const expiresText = input.expiresAt.toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
    });

    return createTransport().sendMail({
        from: requireMailEnv('SMTP_FROM'),
        to: input.email,
        subject: 'Activate your Viral Bridge account',
        text:
            `Your application for ${input.companyName} was approved.\n\n` +
            `Create your password: ${activationUrl}\n\n` +
            `The link expires ${expiresText} UTC and can only be used once.`,
        html:
            `<p>Your application for <strong>${escapeHtml(input.companyName)}</strong> was approved.</p>` +
            `<p><a href="${activationUrl}">Create your Viral Bridge password</a></p>` +
            `<p>This link expires ${escapeHtml(expiresText)} UTC and can only be used once.</p>`,
    });
}

export async function sendRejectionEmail(input: {
    email: string;
    companyName: string;
}) {
    return createTransport().sendMail({
        from: requireMailEnv('SMTP_FROM'),
        to: input.email,
        subject: 'Your Viral Bridge application',
        text:
            `Thank you for your interest in Viral Bridge and for submitting ${input.companyName} for review.\n\n` +
            'After reviewing the available company information, we are unfortunately unable to provide access at this stage. Our current onboarding is focused on businesses with a scalable regional or international growth model.\n\n' +
            'This decision reflects our present service focus and does not assess the overall quality of your business.',
        html:
            `<p>Thank you for your interest in Viral Bridge and for submitting <strong>${escapeHtml(input.companyName)}</strong> for review.</p>` +
            '<p>After reviewing the available company information, we are unfortunately unable to provide access at this stage. Our current onboarding is focused on businesses with a scalable regional or international growth model.</p>' +
            '<p>This decision reflects our present service focus and does not assess the overall quality of your business.</p>',
    });
}

function escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (character) => {
        const entities: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
        };
        return entities[character];
    });
}
