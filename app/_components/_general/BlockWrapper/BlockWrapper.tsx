import { ReactNode } from "react";
import Container from "../Container/Container";
import styles from './BlockWrapper.module.scss';
interface BlockWrapperProps {
    children: ReactNode;
    container?:boolean;
    spacing?: 'top' | 'bottom' | 'hero';
}

export default function BlockWrapper({
    children,
    container = true,
    spacing = 'top'
}:BlockWrapperProps) {
    return (
        <section className={`${styles.block} ${styles[`block--${spacing}`]}`}>
            {container ? (<Container>{children}</Container>) : (children)}
        </section>
    )
}