import Link from "next/link";
import { ReactNode } from "react";
import styles from './Button.module.scss';
interface ButtonProps {
    children: ReactNode;
    link?: string;
    variant?: 'default' | 'accent';
    size?: 'default' | 'large';
    round?: 'default' | 'full';
    circle?: boolean;
}

export default function Button({
    children,
    link,
    variant = 'default',
    size = 'default',
    round,
    circle = true
}:ButtonProps) {
    return (
        link ? (
            <Link href={link} className={`${styles.button} ${styles[`button--${variant}`]} ${styles[`button--size-${size}`]} ${styles[`button--rounded-${round}`]}`}>
                <span className={styles.button__label}>
                    <span>{children}</span>
                    <span aria-hidden="true">{children}</span>
                </span>
                {circle && (
                    <span className={styles.button__circle}></span>
                )}
            </Link>
        ) : (
            <button className={`${styles.button} ${styles[`button--${variant}`]} ${styles[`button--size-${size}`]} ${styles[`button--rounded-${round}`]}`}>
                <span className={styles.button__label}>
                    <span>{children}</span>
                    <span aria-hidden="true">{children}</span>
                </span>
                {circle && (
                    <span className={styles.button__circle}></span>
                )}
            </button>
        )
    )
}
