import { ReactNode } from 'react';
import styles from './SectionHeading.module.scss';

interface SectionHeadingProps {
    tag: string;
    title: ReactNode;
    description?: ReactNode;
    align?: 'left' | 'center';
    theme?: 'light' | 'dark';
}

export default function SectionHeading({
    tag,
    title,
    description,
    align = 'center',
    theme = 'light'
}: SectionHeadingProps) {
    return (
        <div className={`${styles.heading} ${styles[`heading--${align}`]} ${styles[`heading--${theme}`]}`}>
            <div className="tag text text--small">{tag}</div>
            <h2 className="text text--giant text--weight-500">{title}</h2>
            {description && <p className="text text--medium">{description}</p>}
        </div>
    );
}
