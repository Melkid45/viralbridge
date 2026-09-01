import Image, { StaticImageData } from "next/image";
import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import styles from './PartnersBlock.module.scss';
interface PartnersBlockProps {
    title: string;
    partners: {
        logo: StaticImageData | string;
        name?: string;
    }[];
}

export default function PartnersBlock({
    title,
    partners
}:PartnersBlockProps) {
    return (
        <BlockWrapper spacing="small" size="narrow">
            <div className={styles.partners}>
                <h2 className="text text--medium text--color-black text--opacity-60">
                    {title}
                </h2>
                <div className={styles.partners__body}>
                    {partners.map((item, index) => (
                        <div key={item.name ? item.name : '' + index} className={styles.partners__item}>
                            <Image src={item.logo} alt={item.name ? item.name : 'Partners Logo'}/>
                        </div>
                    ))}
                </div>
            </div>
        </BlockWrapper>
    )
}
