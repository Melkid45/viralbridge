'use client';

import { useEffect, useState } from 'react';
import styles from './TypingText.module.scss';

interface TypingTextProps {
    phrases: string[];
}

const TYPE_DELAY = 38;
const DELETE_DELAY = 22;
const HOLD_DELAY = 1600;
const NEXT_PHRASE_DELAY = 320;

export default function TypingText({ phrases }: TypingTextProps) {
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [characterIndex, setCharacterIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);

        updateMotionPreference();
        mediaQuery.addEventListener('change', updateMotionPreference);

        return () => mediaQuery.removeEventListener('change', updateMotionPreference);
    }, []);

    useEffect(() => {
        if (reduceMotion || phrases.length === 0) return;

        const phrase = phrases[phraseIndex];
        let delay = isDeleting ? DELETE_DELAY : TYPE_DELAY;

        if (!isDeleting && characterIndex === phrase.length) {
            delay = HOLD_DELAY;
        } else if (isDeleting && characterIndex === 0) {
            delay = NEXT_PHRASE_DELAY;
        }

        const timeout = window.setTimeout(() => {
            if (!isDeleting && characterIndex === phrase.length) {
                setIsDeleting(true);
                return;
            }

            if (isDeleting && characterIndex === 0) {
                setIsDeleting(false);
                setPhraseIndex((currentIndex) => (currentIndex + 1) % phrases.length);
                return;
            }

            setCharacterIndex((currentIndex) => currentIndex + (isDeleting ? -1 : 1));
        }, delay);

        return () => window.clearTimeout(timeout);
    }, [characterIndex, isDeleting, phraseIndex, phrases, reduceMotion]);

    const activePhrase = phrases[phraseIndex] ?? '';
    const visibleText = reduceMotion ? activePhrase : activePhrase.slice(0, characterIndex);

    return (
        <span className={styles.typing} aria-label={activePhrase}>
            <span aria-hidden="true">{visibleText}</span>
            {!reduceMotion && <span className={styles.typing__cursor} aria-hidden="true" />}
        </span>
    );
}
