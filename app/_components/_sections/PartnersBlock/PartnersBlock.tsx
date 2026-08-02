import Image, { StaticImageData } from "next/image";
import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import styles from './PartnersBlock.module.scss';
import TitleBlock from "../../_general/TitleBlock/TitleBlock";
interface PartnersBlockProps {
    title: string;
    softText: string;
    partners: {
        logo: StaticImageData | string;
        title?: string;
        description?: string;
    }[];
}

export default function PartnersBlock({
    title,
    softText,
    partners
}: PartnersBlockProps) {
    const loopPartners = [...partners, ...partners];

    return (
        <BlockWrapper spacing="top">
            <div className={styles.partners}>
                <TitleBlock
                    title={title}
                    softTitle={softText}
                    number="01"
                />
                <div className={styles.partners__strokes}>
                    <div className={styles.partners__wrapper}>
                        {[0, 1].map((stroke) => (
                            <div
                                className={styles.partners__stroke}
                                key={stroke}
                                aria-hidden={stroke === 1 ? true : undefined}
                            >
                                {loopPartners.map((item, index) => (
                                    <div
                                        key={`${item.title}-${index}`}
                                        className={styles.partners__item}
                                        aria-hidden={stroke === 0 && index >= partners.length ? true : undefined}
                                    >
                                        <Image
                                            src={item.logo}
                                            alt={stroke === 0 && index < partners.length ? item.title || 'Partner logo' : ''}
                                        />
                                        <div className={styles.partners__text}>
                                            <h4 className="text text--medium text--color-black text--weight-500">
                                                {item.title}
                                            </h4>
                                            <p className="text text--color-grey">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </BlockWrapper>
    )
}
