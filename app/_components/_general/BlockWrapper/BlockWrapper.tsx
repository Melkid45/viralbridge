import { ReactNode } from "react";
import Container, { ContainerSize } from "../Container/Container";
import styles from './BlockWrapper.module.scss';
interface BlockWrapperProps {
    children: ReactNode;
    container?:boolean;
    spacing?: 'top' | 'bottom' | 'hero' | 'small';
    customClass?: string;
    id?: string;
    size?: ContainerSize;
}

export default function BlockWrapper({
    children,
    container = true,
    spacing = 'top',
    customClass = '',
    id,
    size = 'default'
}:BlockWrapperProps) {
    return (
        <section id={id} className={`${styles.block} ${styles[`block--${spacing}`]} ${customClass}`}>
            {container ? (<Container size={size}>{children}</Container>) : (children)}
        </section>
    )
}
