import { ChevronDown } from 'lucide-react';
import BlockWrapper from '../../_general/BlockWrapper/BlockWrapper';
import SectionHeading from '../../_general/SectionHeading/SectionHeading';
import styles from './FaqBlock.module.scss';

const questions = [
    {
        question: 'What exactly does ViralBridge do?',
        answer: 'It connects your growth data, monitors changes, finds opportunities and turns them into prioritized recommendations and approved actions.'
    },
    {
        question: 'Does it replace our marketing team or agency?',
        answer: 'No. It removes repetitive analysis and keeps context in one place, so your team or partners can spend more time on decisions and execution.'
    },
    {
        question: 'Will the system publish or change things automatically?',
        answer: 'Only if you choose that workflow. Customer-facing actions can stay behind an approval step, and every action remains visible and reviewable.'
    },
    {
        question: 'What can we connect first?',
        answer: 'A website, analytics and search data are enough to begin. Social channels, publishing tools and other integrations can be added later.'
    },
    {
        question: 'How quickly can we start?',
        answer: 'The first scan can begin after a short onboarding. A connected operating setup depends on the number of websites, channels and integrations.'
    },
    {
        question: 'What is included in the Flex plan?',
        answer: 'Flex is designed around custom markets, data sources, content volumes, approval workflows, integrations and support requirements.'
    }
];

export default function FaqBlock() {
    return (
        <BlockWrapper id="faq" size="narrow">
            <div className={styles.faq}>
                <div className={styles.faq__heading}>
                    <SectionHeading
                        tag="FAQ"
                        title="Questions, answered."
                        description="The short version of how ViralBridge fits into your team and workflow."
                        align="left"
                    />
                </div>
                <div className={styles.faq__list}>
                    {questions.map((item, index) => (
                        <details key={item.question} className={styles.faq__item} open={index === 0}>
                            <summary>
                                <span>{item.question}</span>
                                <ChevronDown aria-hidden="true" />
                            </summary>
                            <p>{item.answer}</p>
                        </details>
                    ))}
                </div>
            </div>
        </BlockWrapper>
    );
}
