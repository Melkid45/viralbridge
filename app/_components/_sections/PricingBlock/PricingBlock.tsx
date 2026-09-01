import { Check } from "lucide-react";
import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import SectionHeading from "../../_general/SectionHeading/SectionHeading";
import styles from './PricingBlock.module.scss';
import Button from "../../_general/Button/Button";
interface PricingBlockProps {
    tag: string;
    title: string;
    list?: PricingItemProps[];
}

interface PricingItemProps {
    name: string;
    description: string;
    cost: string;
    attr: {
        text: string;
    }[];
    button: string;
}

const pricingList: PricingItemProps[] = [
    {
        name: 'Launch',
        description: 'First company and competitor scan, priority roadmap and monthly review.',
        cost: '490€',
        attr: [
            {
                text: '1 website'
            },
            {
                text: '2 connected channels'
            },
            {
                text: 'Monthly market scan'
            },
            {
                text: 'Priority roadmap'
            },
            {
                text: 'Monthly review call'
            },
        ],
        button: 'Choose Launch'
    },
    {
        name: 'Scale',
        description: 'Continuous market monitoring, connected specialist agents, content activity and reporting.',
        cost: '990€',
        attr: [
            {
                text: 'Up to  3 websites'
            },
            {
                text: 'Up to 6 connected channels'
            },
            {
                text: 'Continuous monitoring'
            },
            {
                text: 'Content planning & tracking'
            },
            {
                text: 'Live reporting 4 priority support'
            },
        ],
        button: 'Choose Scale'
    },
    {
        name: 'Flex',
        description: 'Custom markets, integrations, content volumes, approval workflows and team requirements.',
        cost: 'Custom',
        attr: [
            {
                text: 'Custom websites & channels'
            },
            {
                text: 'Custom data & integrations'
            },
            {
                text: 'Custom content &  tracking'
            },
            {
                text: 'Custom workflows & apprevals'
            },
            {
                text: 'Dedicated support'
            },
        ],
        button: 'Talk to us'
    },
]


export default function PricingBlock({
    tag,
    title,
    list = pricingList
}: PricingBlockProps) {
    return (
        <BlockWrapper id="prices" spacing="top" size="narrow">
            <div className={styles.pricing}>
                <SectionHeading tag={tag} title={title} />
                <div className={styles.pricing__body}>
                    {list.map((item) => (
                        <div key={item.name} className={styles.pricing__item}>
                            <div className={styles['pricing__item-text']}>
                                <div className={styles.pricing__title}>
                                    <h3 className="text text--medium">
                                        {item.name}
                                    </h3>
                                    <p className="text text--small">
                                        {item.description}
                                    </p>
                                </div>
                                <span className="text text--giant">
                                    {item.cost}
                                </span>
                                <ul>
                                    {item.attr.map((item) => (
                                        <li key={item.text} className="text text--small">
                                            <Check />
                                            {item.text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Button link="/#contact" round="full" circle={false}>
                                {item.button}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </BlockWrapper>
    )
}
