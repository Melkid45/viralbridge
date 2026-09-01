
import Image, { StaticImageData } from 'next/image';
import BlockWrapper from '../../_general/BlockWrapper/BlockWrapper';
import SectionHeading from '../../_general/SectionHeading/SectionHeading';
import styles from './OutcomesBlock.module.scss';
import Icon1 from '@/app/assets/images/outcomes/1.png';
import Icon2 from '@/app/assets/images/outcomes/2.png';
import Icon3 from '@/app/assets/images/outcomes/3.png';
import Icon4 from '@/app/assets/images/outcomes/4.png';
import Icon5 from '@/app/assets/images/outcomes/5.png';

interface Outcome {
    title: string;
    description: string;
    value: string;
    metric: string;
    icon: StaticImageData | string;
}

const outcomes: Outcome[] = [
    {
        title: 'More qualified traffic',
        description: 'Reach people already looking for your product or service.',
        value: '+38%',
        metric: 'organic sessions',
        icon: Icon1
    },
    {
        title: 'Stronger content performance',
        description: 'Turn market demand into content people actually engage with.',
        value: '+57%',
        metric: 'content engagement',
        icon: Icon2
    },
    {
        title: 'Higher conversion rates',
        description: 'Find and fix the points where high-intent visitors drop away.',
        value: '+26%',
        metric: 'conversion rate',
        icon: Icon3
    },
    {
        title: 'Lower marketing overhead',
        description: 'Replace repetitive research and reporting with one connected flow.',
        value: '-41%',
        metric: 'time spent on reporting',
        icon: Icon4
    },
    {
        title: 'Clear growth decisions',
        description: 'Know what matters now, why it matters and what to do next.',
        value: '+31%',
        metric: 'growth efficiency',
        icon: Icon5
    }
];

export default function OutcomesBlock() {
    return (
        <BlockWrapper size="narrow">
            <div className={styles.outcomes}>
                <SectionHeading tag="Advantages" title="What changes for your business" />
                <div className={styles.outcomes__grid}>
                    {outcomes.map((outcome) => {
                        const Icon = outcome.icon;

                        return (
                            <article key={outcome.title} className={styles.outcomes__card}>
                                <Image className={styles.outcomes__image} src={outcome.icon} alt={outcome.title} />
                                <div className={styles.outcomes__content}>
                                    <h3 className='text text--medium'>{outcome.title}</h3>
                                    <p className='text text--small'>{outcome.description}</p>
                                    <div className={styles.outcomes__metric}>
                                        <strong>{outcome.value}</strong>
                                        <span className='text text--small'>{outcome.metric}</span>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </BlockWrapper>
    );
}
