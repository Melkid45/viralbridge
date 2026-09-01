'use client';

import { FormEvent, useState } from 'react';
import { loginRequestSchema } from '@/lib/validation';
import styles from '@/app/_components/_auth/AuthForms.module.scss';

export default function LoginForm() {
    const [error, setError] = useState<string>();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const parsed = loginRequestSchema.safeParse({
            email: formData.get('email'),
            password: formData.get('password'),
        });
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Enter your email and password.');
            return;
        }

        setSubmitting(true);
        setError(undefined);
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed.data),
            });
            const result = (await response.json()) as { ok?: boolean; error?: string };
            if (!response.ok || !result.ok) {
                throw new Error(result.error ?? 'Could not sign in.');
            }
            window.location.assign('/hello');
        } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : 'Could not sign in.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className={styles.authForm} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" />
            </div>
            <div className={styles.field}>
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" />
            </div>
            {error && <p className={styles.formError}>{error}</p>}
            <button className={styles.submit} disabled={submitting} type="submit">
                {submitting ? 'Signing in…' : 'Sign in'}
            </button>
        </form>
    );
}
