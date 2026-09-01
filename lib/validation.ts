import { z } from 'zod';

const websiteSchema = z
    .string()
    .trim()
    .max(2_048, 'Website address is too long.')
    .transform((website) =>
        /^https?:\/\//i.test(website) ? website : `https://${website}`,
    )
    .pipe(
        z.url('Enter a valid website address.').refine((website) => {
            const url = new URL(website);
            return (
                ['http:', 'https:'].includes(url.protocol) &&
                url.hostname.includes('.') &&
                !url.hostname.startsWith('.') &&
                !url.hostname.endsWith('.')
            );
        }, 'Enter a valid website address.'),
    );

export const applicationRequestSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Enter your full name.')
        .max(160, 'Full name is too long.'),
    company: z
        .string()
        .trim()
        .min(2, 'Enter a company name.')
        .max(160, 'Company name is too long.'),
    email: z
        .string()
        .trim()
        .min(1, 'Enter your work email.')
        .email('Enter a valid email address.')
        .max(320, 'Email address is too long.')
        .transform((email) => email.toLowerCase()),
    phone: z
        .string()
        .trim()
        .min(1, 'Enter your phone number.')
        .max(32, 'Phone number is too long.')
        .refine((phone) => /^[+\d][\d\s().-]+$/.test(phone), 'Enter a valid phone number.')
        .refine((phone) => {
            const digitCount = phone.replace(/\D/g, '').length;
            return digitCount >= 7 && digitCount <= 15;
        }, 'Enter a valid phone number.'),
    website: z.preprocess(
        (website) =>
            typeof website === 'string' && website.trim() === '' ? undefined : website,
        websiteSchema.optional(),
    ),
    policy: z
        .boolean()
        .refine((accepted) => accepted, 'Please accept the data processing policy.'),
});

export const activationRequestSchema = z
    .object({
        token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Activation token is invalid.'),
        password: z
            .string()
            .min(12, 'Password must contain at least 12 characters.')
            .max(128, 'Password is too long.'),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
    });

export const loginRequestSchema = z.object({
    email: z.string().trim().email('Enter a valid email address.').max(320),
    password: z.string().min(1, 'Enter your password.').max(128),
});
