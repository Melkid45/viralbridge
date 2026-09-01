'use client';

import Link from "next/link";
import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import Button from "../../_general/Button/Button";
import InputItem from "./InputItem/InputItem";
import styles from './RequestBlock.module.scss';
import Image from "next/image";
import { Check } from "lucide-react";
import { useApplicationForm } from "@/app/_hooks/useApplicationForm";
import RequestImage from '@/app/assets/images/request.png';

interface RequestBlockProps {
    title: string;
    description: string;
    list: {
        text: string
    }[];
}

export default function RequestBlock({
    title,
    description,
    list
}:RequestBlockProps) {
    const { errors, submission, clearError, handleSubmit } = useApplicationForm();

    return (
        <BlockWrapper id="contact" spacing="top" size="narrow">
            <div className={styles.request}>
                <div className={styles.request__main}>
                    <div className={styles['request__main-text']}>
                        <h2 className="text text--giant">
                            {title}
                        </h2>
                        <p className="text text--small">
                            {description}
                        </p>
                    </div>
                    <ul>
                        {list.map((item) => (
                            <li key={item.text} className="text text--small">
                                <Check/>
                                {item.text}
                            </li>
                        ))}
                    </ul>
                </div>
                <Image src={RequestImage} alt="" aria-hidden="true"/>
                <form className={styles.request__form} onSubmit={handleSubmit} noValidate>
                    <div className={styles['request__form-wrapper']}>
                        <InputItem
                            type="text"
                            placeholder="Alex Morgan"
                            label="Full Name"
                            name="name"
                            error={errors.name}
                            onChange={() => clearError('name')}
                            autoComplete="name"
                        />
                        <InputItem
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
                            type="text"
                            placeholder="Your Company"
                            label="Company name"
                            name="company"
                            error={errors.company}
                            onChange={() => clearError('company')}
                            autoComplete="organization"
                            size="full"
                        />
                        <div className={`${styles.request__checkbox} ${errors.policy ? styles['request__checkbox--error'] : ''}`}>
                            <div>
                                <input
                                    type="checkbox"
                                    name="policy"
                                    aria-invalid={Boolean(errors.policy)}
                                    aria-describedby={errors.policy ? 'policy-error' : undefined}
                                    onChange={() => clearError('policy')}
                                />
                            </div>
                            <div className={styles.request__consent}>
                                <p className="text text--small">
                                    I agree to the processing of <Link href={`/policy`}>Personal data</Link>
                                </p>
                                {errors.policy && <span id="policy-error">{errors.policy}</span>}
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="accent"
                        round="full"
                        size="large"
                        disabled={submission.status === 'submitting'}
                    >
                        {submission.status === 'submitting' ? 'Sending…' : 'Run the first scan'}
                    </Button>
                    {submission.message && (
                        <p
                            className={`${styles.request__status} ${styles[`request__status--${submission.status}`]}`}
                            role="status"
                        >
                            {submission.message}
                        </p>
                    )}
                </form>
            </div>
        </BlockWrapper>
    )
}
