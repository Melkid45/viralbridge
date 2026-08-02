
import styles from './TitleBlock.module.scss';

interface TitleBlockProps {
    title: string;
    description?: string;
    number: string;
    softTitle: string;
}


export default function TitleBlock({
    number,
    title,
    description,
    softTitle
}:TitleBlockProps) {
    return (
        <div className={styles.title}>
            <div className={styles.title__number}>
                <span className='text text--color-accent'>
                    {number}
                </span>
                <div className={styles.number__line}></div>
                <h3 className='text text--color-grey'>
                    {softTitle}
                </h3>
            </div>
            <h2 className="heading heading--title">
                {title}
            </h2>
        </div>
    )
}