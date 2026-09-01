import { ReactNode } from "react"
import styles from './Container.module.scss';

export type ContainerSize = 'default' | 'narrow';

interface ContainerProps {
    children: ReactNode;
    size?: ContainerSize;
}

export default function Container({
    children,
    size = 'default'
}:ContainerProps) {
    return (
        <div className={`${styles.container} ${styles[`container--${size}`]}`}>
            {children}
        </div>
    )
}
