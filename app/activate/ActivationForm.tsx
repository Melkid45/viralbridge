'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { activationRequestSchema } from '@/lib/validation';
import styles from '@/app/_components/_auth/AuthForms.module.scss';

type FieldName = 'password' | 'confirmPassword';

export default function ActivationForm({ token }: { token: string }) {
    const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
    const [formError, setFormError] = useState<string>();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const parsed = activationRequestSchema.safeParse({
            token,
            password: data.get('password'),
            confirmPassword: data.get('confirmPassword'),
        });

        if (!parsed.success) {
            const nextErrors: Partial<Record<FieldName, string>> = {};
            parsed.error.issues.forEach((issue) => {
                const field = issue.path[0] as FieldName;
                if ((field === 'password' || field === 'confirmPassword') && !nextErrors[field]) {
                    nextErrors[field] = issue.message;
                }
            });
            setErrors(nextErrors);
            return;
        }

        setSubmitting(true);
        setFormError(undefined);
        try {
            const response = await fetch('/api/activation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed.data),
            });
            const result = (await response.json()) as { ok?: boolean; error?: string };
            if (!response.ok || !result.ok) {
                throw new Error(result.error ?? 'Could not activate the account.');
            }
            window.location.assign('/hello');
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Could not activate the account.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!token) {
        return (
            <>
                <p>This activation link is incomplete.</p>
                <Link className={styles.secondaryLink} href="/login">Go to login</Link>
            </>
        );
    }

    return (
        <form className={styles.authForm} onSubmit={handleSubmit} noValidate>
            <AuthField
                name="password"
                label="Create password"
                type="password"
                autoComplete="new-password"
                error={errors.password}
                onChange={() => setErrors((current) => ({ ...current, password: undefined }))}
            />
            <AuthField
                name="confirmPassword"
                label="Repeat password"
                type="password"
                autoComplete="new-password"
                error={errors.confirmPassword}
                onChange={() => setErrors((current) => ({ ...current, confirmPassword: undefined }))}
            />
            {formError && <p className={styles.formError}>{formError}</p>}
            <button className={styles.submit} disabled={submitting} type="submit">
                {submitting ? 'Creating account…' : 'Create account'}
            </button>
        </form>
    );
}

function AuthField(props: {
    name: FieldName;
    label: string;
    type: string;
    autoComplete: string;
    error?: string;
    onChange: () => void;
}) {
    return (
        <div className={`${styles.field} ${props.error ? styles['field--error'] : ''}`}>
            <label htmlFor={props.name}>{props.label}</label>
            <input
                id={props.name}
                name={props.name}
                type={props.type}
                autoComplete={props.autoComplete}
                aria-invalid={Boolean(props.error)}
                onChange={props.onChange}
            />
            {props.error && <span className={styles.fieldError}>{props.error}</span>}
        </div>
    );
}
