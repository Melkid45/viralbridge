import Image from 'next/image';
import BlockWrapper from '../../_general/BlockWrapper/BlockWrapper';
import SectionHeading from '../../_general/SectionHeading/SectionHeading';
import TopImage from '@/app/assets/images/growth-cycle/top.png';
import BottomImage from '@/app/assets/images/growth-cycle/bottom.png';
import styles from './GrowthCycleBlock.module.scss';

const steps = [
    {
        title: 'Connect',
        description: 'Your website, analytics, search data and social channels come together in one place.'
    },
    {
        title: 'Analyze',
        description: 'ViralBridge identifies demand, content gaps, weak conversion points and audience shifts.'
    },
    {
        title: 'Prioritize',
        description: 'The system ranks actions by potential impact, not generic marketing checklists.'
    },
    {
        title: 'Execute',
        description: 'Approved improvements, content activity and campaigns move into execution.'
    },
    {
        title: 'Learn',
        description: 'Every interaction makes the next recommendation more precise.'
    },
    {
        title: 'Improve',
        description: 'Results feed back into the system to increase accuracy and impact.'
    }
];

export default function GrowthCycleBlock() {
    return (
        <BlockWrapper id="how" size="narrow">
            <div className={styles.cycle}>
                <SectionHeading
                    tag="How it works"
                    title="One continuous growth cycle"
                    description="From data to insight to action. Always learning, always improving."
                />
                <div className={styles.cycle__grid}>
                    <div className={`${styles.cycle__image} ${styles['cycle__image--top']}`}>
                        <Image src={TopImage} alt="Connected growth data flow" fill sizes="(max-width: 767px) 100vw, 50vw" />
                    </div>
                    <div className={`${styles.cycle__image} ${styles['cycle__image--bottom']}`}>
                        <Image src={BottomImage} alt="Growth analytics pipeline" fill sizes="(max-width: 767px) 100vw, 50vw" />
                    </div>
                    {steps.map((step, index) => (
                        <article
                            key={step.title}
                            className={`${styles.cycle__card} ${styles[`cycle__card--${index + 1}`]}`}
                        >
                            <span className={`${styles.cycle__number} text text--small`}>{String(index + 1).padStart(2, '0')}</span>
                            <div>
                                <h3 className="text text--medium">{step.title}</h3>
                                <p className='text text--small'>{step.description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </BlockWrapper>
    );
}
