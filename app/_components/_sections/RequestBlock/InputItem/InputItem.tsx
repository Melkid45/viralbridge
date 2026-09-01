import { ChangeEventHandler, HTMLInputAutoCompleteAttribute, HTMLInputTypeAttribute } from 'react';
import styles from './InputItem.module.scss';

interface InputItemProps {
    name: string;
    label: string;
    placeholder: string;
    type: HTMLInputTypeAttribute;
    error?: string;
    onChange?: ChangeEventHandler<HTMLInputElement>;
    size?: 'default' | 'full';
    autoComplete?: HTMLInputAutoCompleteAttribute;
    inputMode?: 'email' | 'search' | 'tel' | 'text' | 'url';
    theme?: 'dark' | 'light';
}


export default function InputItem({
    name,
    label,
    placeholder,
    type,
    error,
    onChange,
    size,
    autoComplete,
    inputMode,
    theme = 'dark',
}: InputItemProps) {
    return (
        <div className={`${styles.input__item} ${error ? styles['input__item--error'] : ''} ${size === 'full' ? styles['input__item--full'] : ''} ${theme === 'light' ? styles['input__item--light'] : ''}`}>
            <div className={styles['input__item-wrapper']}>
                <label className={styles.input__label} htmlFor={name}>
                    {label}
                </label>
                {error && <span id={`${name}-error`} className={styles.input__error}>{error}</span>}
            </div>
            <input
                className={styles.input__control}
                id={name}
                type={type}
                placeholder={placeholder}
                name={name}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${name}-error` : undefined}
                onChange={onChange}
                autoComplete={autoComplete}
                inputMode={inputMode}
            />
        </div>
    )
}
