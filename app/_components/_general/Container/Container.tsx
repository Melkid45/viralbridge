import { ReactNode } from "react"
import styles from './Container.module.scss';
interface ContainerProps {
    children: ReactNode;
    type?: 'default' | 'full';
}



export default function Container({
    children,
    type = 'default'
}:ContainerProps) {
    return (
        <div className={styles.container}>
            {children}
        </div>
    )
}