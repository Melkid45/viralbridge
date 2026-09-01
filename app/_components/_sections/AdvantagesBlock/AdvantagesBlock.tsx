import { ReactNode } from "react";
import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import styles from './AdvantagesBlock.module.scss';
import SectionHeading from "../../_general/SectionHeading/SectionHeading";
import { BookText, ChartColumnDecreasing, ChartLine, Cpu, Globe, Layers, ScreenShare, Search, Sprout, Summary, UserRoundKey, Users } from "lucide-react";
interface AdvantagesBlockProps {
    tag: string;
    title: string;
    description?: string;
    autoItems?: itemProps[];
    approveItems?: itemProps[];
}

interface itemProps {
    icon: ReactNode | string;
    name: string | ReactNode;
}


const autoItemsArray: itemProps[] = [
    {
        icon: <Search/>,
        name: 'Search visibility monitoring',
    },
    {
        icon: <Cpu/>,
        name: 'Competitor tracking',
    },
    {
        icon: <Search/>,
        name: 'Content opportunity discovery',
    },
    {
        icon: <ChartLine/>,
        name: 'Social & video analysis',
    },
    {
        icon: <ChartColumnDecreasing/>,
        name: 'Conversion monitoring',
    },
    {
        icon: <Sprout/>,
        name: 'Growth recommendations',
    },
    {
        icon: <Summary/>,
        name: 'Reporting & alerts',
    },
    {
        icon: <ScreenShare/>,
        name: 'Market trend scan',
    },
    {
        icon: <Users/>,
        name: 'Segment & audience insights',
    },
    {
        icon: <BookText/>,
        name: 'Daily & weekly summaries',
    },
]
const approveItemsArray: itemProps[] = [
    {
        icon: <Globe/>,
        name: <>Website <br /> changes</>
    },
    {
        icon: <UserRoundKey/>,
        name: <>Content <br /> publishing</>
    },
    {
        icon: <Layers/>,
        name: <>Campaign <br /> updates</>
    },
    {
        icon: <Users/>,
        name: <>Customer-facing <br /> actions</>
    },
]

export default function AdvantagesBlock({
    tag,
    title,
    description,
    autoItems = autoItemsArray,
    approveItems = approveItemsArray
}: AdvantagesBlockProps) {
    return (
        <BlockWrapper spacing="top" size="narrow">
            <div className={styles.advantages}>
                <SectionHeading tag={tag} title={title} />
                <div className={styles.advantages__body}>
                    <div className={styles.advantages__item}>
                        <h3 className="text text--medium text--weight-600">
                            Runs automatically
                        </h3>
                        <div className={styles['advantages__item-frame']}>
                            {autoItems.map((item, index) => (
                                <div key={index} className={styles.frame__item}>
                                    <div className={styles['frame__item-icon']}>
                                        {item.icon}
                                    </div>
                                    <span className="text text--tiny">
                                        {item.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.advantages__item}>
                        <h3 className="text text--medium text--weight-600">
                            Runs after approval
                        </h3>
                        <div className={styles['advantages__item-frame']}>
                            {approveItems.map((item, index) => (
                                <div key={index} className={styles.frame__item}>
                                    <div className={styles['frame__item-icon']}>
                                        {item.icon}
                                    </div>
                                    <span className="text text--tiny">
                                        {item.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {description && (
                    <p className="text text--medium">
                        {description}
                    </p>
                )}
            </div>
        </BlockWrapper>
    )
}
