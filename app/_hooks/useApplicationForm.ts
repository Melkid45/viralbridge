'use client';

import { FormEvent, useState } from 'react';
import { applicationRequestSchema } from '@/lib/validation';

type FieldName = 'name' | 'email' | 'phone' | 'website' | 'company' | 'policy';
type FormErrors = Partial<Record<FieldName, string>>;
type Submission = {
    status: 'idle' | 'submitting' | 'success' | 'error';
    message?: string;
};

export function useApplicationForm() {
    const [errors, setErrors] = useState<FormErrors>({});
    const [submission, setSubmission] = useState<Submission>({ status: 'idle' });

    const clearError = (field: FieldName) => {
        setErrors((currentErrors) => {
            if (!currentErrors[field]) return currentErrors;

            const nextErrors = { ...currentErrors };
            delete nextErrors[field];
            return nextErrors;
        });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);
        const validationResult = applicationRequestSchema.safeParse({
            name: formData.get('name'),
            company: formData.get('company'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            website: formData.get('website'),
            policy: formData.get('policy') === 'on',
        });
        const nextErrors: FormErrors = {};

        if (!validationResult.success) {
            validationResult.error.issues.forEach((issue) => {
                const field = issue.path[0] as FieldName | undefined;
                if (field && !nextErrors[field]) {
                    nextErrors[field] = issue.message;
                }
            });
        }

        setErrors(nextErrors);

        const firstInvalidField = Object.keys(nextErrors)[0] as FieldName | undefined;
        if (firstInvalidField) {
            const field = form.elements.namedItem(firstInvalidField);
            if (field instanceof HTMLElement) field.focus();
            return;
        }

        setSubmission({ status: 'submitting' });
        try {
            const response = await fetch('/api/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validationResult.data),
            });
            const result = (await response.json()) as {
                ok?: boolean;
                error?: string;
                onboardingUrl?: string;
            };

            if (!response.ok || !result.ok || !result.onboardingUrl) {
                throw new Error(result.error ?? 'Could not submit the application.');
            }

            window.location.assign(result.onboardingUrl);
        } catch (error) {
            setSubmission({
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Could not submit the application.',
            });
        }
    };

    return { errors, submission, clearError, handleSubmit };
}
