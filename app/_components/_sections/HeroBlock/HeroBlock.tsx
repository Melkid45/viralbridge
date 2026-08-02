import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import styles from './HeroBlock.module.scss';

interface HeroBlockProps {
    items?: {
        text: string;
    }[];
    softTitle: string;
    description: string;
}

export default function HeroBlock({
    items,
    softTitle,
    description
}:HeroBlockProps) {
    return (
        <BlockWrapper spacing="hero" container={false}>
            <div className={styles.hero}>
                <h1 className={`${styles.hero__head} heading heading--giant`}>
                    <span>Viral</span>
                    <span>Scale</span>
                </h1>
                <div className={styles.hero__body}>
                    <div className={styles.hero__media} aria-hidden="true">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="auto"
                            poster="/media/viralbridge-hero-poster.jpg"
                        >
                            <source src="/media/viralbridge-hero.webm" type="video/webm" />
                            <source src="/media/viralbridge-hero.mp4" type="video/mp4" />
                        </video>
                    </div>
                    {items && (
                        <div className={styles.hero__items}>
                            {items.map((item) => (
                                <div key={item.text} className={styles.hero__item}>
                                    <span>{item.text}</span>
                                    <span className={styles.hero__itemLine} aria-hidden="true" />
                                </div>
                            ))}
                        </div>
                    )}
                    <div className={styles.hero__marquee} aria-hidden="true">
                        <div className={styles.hero__marqueeTrack}>
                            <span>Scroll to reveal —</span>
                            <span>Scroll to reveal —</span>
                            <span>Scroll to reveal —</span>
                        </div>
                    </div>
                    <div className={styles.hero__bottom}>
                        <div className={styles.hero__information}>
                            <h3 className={styles.hero__label}>
                                {softTitle}
                            </h3>
                            <p className={styles.hero__description}>
                                {description}
                            </p>
                        </div>
                        <div className={styles.hero__status}>
                            <div className={styles.hero__statusMark}>VB</div>
                            <div className={styles.hero__statusCopy}>
                                <strong>AI growth team</strong>
                                <span>Always on. Always learning.</span>
                            </div>
                            <span className={styles.hero__statusDot} aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </div>
        </BlockWrapper>
    )
}
