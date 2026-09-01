'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, MailCheck, Send, Sparkles } from 'lucide-react';
import styles from './page.module.scss';

type OnboardingState = {
    companyName: string;
    applicationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVATED';
    fitStatus:
        | 'QUEUED'
        | 'RUNNING'
        | 'NEEDS_INFO'
        | 'MANUAL_REVIEW'
        | 'AUTO_APPROVED'
        | 'AUTO_REJECTED'
        | 'FAILED';
    canAnswer: boolean;
    shouldPoll: boolean;
    messages: Array<{
        id: string;
        role: 'USER' | 'ASSISTANT' | 'SYSTEM';
        content: string;
        createdAt: string;
    }>;
};

type ApiResponse = {
    ok?: boolean;
    state?: OnboardingState;
    error?: string;
};

const statusText: Record<OnboardingState['fitStatus'], string> = {
    QUEUED: 'Queued for research',
    RUNNING: 'Researching your company',
    NEEDS_INFO: 'Waiting for your answer',
    MANUAL_REVIEW: 'Specialist review',
    AUTO_APPROVED: 'Approved',
    AUTO_REJECTED: 'Decision emailed',
    FAILED: 'Manual fallback',
};

export default function OnboardingChat({ token }: { token: string }) {
    const [state, setState] = useState<OnboardingState>();
    const [error, setError] = useState<string>();
    const [answer, setAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const requestState = async (path = '', method: 'GET' | 'POST' = 'GET', body?: object) => {
        const response = await fetch(`/api/onboarding/${token}${path}`, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            cache: 'no-store',
        });
        const result = (await response.json()) as ApiResponse;
        if (!response.ok || !result.ok || !result.state) {
            throw new Error(result.error ?? 'Could not load onboarding.');
        }
        setState(result.state);
        setError(undefined);
        return result.state;
    };

    useEffect(() => {
        requestState().catch((requestError) => {
            setError(requestError instanceof Error ? requestError.message : 'Could not load onboarding.');
        });
    }, []);

    useEffect(() => {
        if (!state?.shouldPoll) return;

        const timeout = window.setTimeout(() => {
            requestState('/sync', 'POST').catch((requestError) => {
                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : 'Could not update onboarding.',
                );
            });
        }, 3_000);
        return () => window.clearTimeout(timeout);
    }, [state]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const message = answer.trim();
        if (message.length < 2 || submitting) return;

        setSubmitting(true);
        try {
            await requestState('', 'POST', { message });
            setAnswer('');
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Could not send answer.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!state) {
        return (
            <div className={styles.chat}>
                <div className={styles.loading}>
                    <LoaderCircle />
                    <p>{error ?? 'Opening your onboarding session…'}</p>
                </div>
            </div>
        );
    }

    const approved = state.applicationStatus === 'APPROVED' || state.applicationStatus === 'ACTIVATED';
    const rejected = state.applicationStatus === 'REJECTED';

    return (
        <div className={styles.chat}>
            <header className={styles.chatHeader}>
                <div>
                    <span className={styles.agentIcon}><Sparkles /></span>
                    <div>
                        <strong>Viral Bridge fit agent</strong>
                        <span>{state.companyName}</span>
                    </div>
                </div>
                <span className={`${styles.status} ${approved ? styles.statusApproved : ''} ${rejected ? styles.statusSettled : ''}`}>
                    {approved ? <CheckCircle2 /> : rejected ? <MailCheck /> : <LoaderCircle />}
                    {approved ? 'Approved' : rejected ? 'Decision emailed' : statusText[state.fitStatus]}
                </span>
            </header>

            <div className={styles.messages} aria-live="polite">
                {state.messages.map((message) => (
                    <article
                        className={`${styles.message} ${message.role === 'USER' ? styles.messageUser : ''}`}
                        key={message.id}
                    >
                        <span>{message.role === 'USER' ? 'You' : 'Viral Bridge'}</span>
                        <p>{message.content}</p>
                    </article>
                ))}
            </div>

            {state.canAnswer ? (
                <form className={styles.composer} onSubmit={handleSubmit}>
                    <label htmlFor="onboarding-answer">Your answer</label>
                    <div>
                        <textarea
                            id="onboarding-answer"
                            value={answer}
                            onChange={(event) => setAnswer(event.target.value)}
                            maxLength={2_000}
                            placeholder="Tell us briefly…"
                            rows={3}
                        />
                        <button disabled={submitting || answer.trim().length < 2} type="submit">
                            <Send />
                            <span>{submitting ? 'Sending…' : 'Send'}</span>
                        </button>
                    </div>
                </form>
            ) : (
                <footer className={styles.chatFooter}>
                    {state.shouldPoll
                        ? 'You can keep this page open. The status updates automatically.'
                        : approved
                          ? 'Check your inbox for the secure, single-use activation link.'
                          : rejected
                            ? 'Please check your inbox for our decision.'
                            : 'No action is needed. We will send the final decision by email.'}
                </footer>
            )}
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
