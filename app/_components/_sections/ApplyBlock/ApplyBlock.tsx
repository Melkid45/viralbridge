'use client';

import Link from "next/link";
import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import Button from "../../_general/Button/Button";
import SectionHeading from "../../_general/SectionHeading/SectionHeading";
import InputItem from "../RequestBlock/InputItem/InputItem";
import styles from './ApplyBlock.module.scss';
import { useApplicationForm } from "@/app/_hooks/useApplicationForm";

const steps = [
    { number: '01', text: 'We review this company' },
    { number: '02', text: 'You receive a private link' },
    { number: '03', text: 'The consultant asks follow-ups' },
    { number: '04', text: 'Your exact package is calculated' },
];

export default function ApplyBlock() {
    const { errors, submission, clearError, handleSubmit } = useApplicationForm();

    return (
        <BlockWrapper spacing="top" size="default">
            <div className={styles.apply}>
                <div className={styles.apply__intro}>
                    <SectionHeading
                        tag="Start your company scan"
                        title="Tell us enough to understand the business"
                        align="left"
                    />
                    <div className={styles.apply__steps}>
                        <span className="text text--small text--weight-500">What happens next</span>
                        <ol>
                            {steps.map((step) => (
                                <li key={step.number} className="text text--small">
                                    <b>{step.number}</b>
                                    {step.text}
                                </li>
                            ))}
                        </ol>
                        <p className="text text--tiny">No payments at this stage.</p>
                    </div>
                </div>
                <form className={styles.apply__form} onSubmit={handleSubmit} noValidate>
                    <h2 className="text text--medium text--weight-600">Company application</h2>
                    <div className={styles.apply__grid}>
                        <InputItem
                            theme="light"
                            type="text"
                            placeholder="Alex Morgan"
                            label="Full Name"
                            name="name"
                            error={errors.name}
                            onChange={() => clearError('name')}
                            autoComplete="name"
                        />
                        <InputItem
                            theme="light"
                            type="email"
                            placeholder="alex@northstar.co"
                            label="Work email"
                            name="email"
                            error={errors.email}
                            onChange={() => clearError('email')}
                            autoComplete="email"
                            inputMode="email"
                        />
                        <InputItem
                            theme="light"
                            type="tel"
                            placeholder="Enter phone number"
                            label="Phone"
                            name="phone"
                            error={errors.phone}
                            onChange={() => clearError('phone')}
                            autoComplete="tel"
                            inputMode="tel"
                        />
                        <InputItem
                            theme="light"
                            type="url"
                            placeholder="https:// (optional)"
                            label="Website (optional)"
                            name="website"
                            error={errors.website}
                            onChange={() => clearError('website')}
                            autoComplete="url"
                            inputMode="url"
                        />
                        <InputItem
                            theme="light"
                            type="text"
                            placeholder="Northstar Studio"
                            label="Company name"
                            name="company"
                            error={errors.company}
                            onChange={() => clearError('company')}
                            autoComplete="organization"
                            size="full"
                        />
                        <div className={`${styles.apply__checkbox} ${errors.policy ? styles['apply__checkbox--error'] : ''}`}>
                            <div>
                                <input
                                    type="checkbox"
                                    name="policy"
                                    aria-invalid={Boolean(errors.policy)}
                                    aria-describedby={errors.policy ? 'apply-policy-error' : undefined}
                                    onChange={() => clearError('policy')}
                                />
                            </div>
                            <div className={styles.apply__consent}>
                                <p className="text text--small">
                                    I agree to the processing of <Link href="/policy">Personal data</Link>
                                </p>
                                {errors.policy && <span id="apply-policy-error">{errors.policy}</span>}
                            </div>
                        </div>
                    </div>
                    <p className={`${styles.apply__note} text text--tiny`}>
                        Your information is used only to prepare the consultation.
                    </p>
                    <Button
                        variant="accent"
                        round="full"
                        size="large"
                        disabled={submission.status === 'submitting'}
                    >
                        {submission.status === 'submitting' ? 'Sending…' : 'Run your scan'}
                    </Button>
                    {submission.message && (
                        <p
                            className={`${styles.apply__status} ${styles[`apply__status--${submission.status}`]}`}
                            role="status"
                        >
                            {submission.message}
                        </p>
                    )}
                </form>
            </div>
        </BlockWrapper>
    );
}
