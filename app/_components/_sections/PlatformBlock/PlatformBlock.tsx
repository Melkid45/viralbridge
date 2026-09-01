import Image, { StaticImageData } from "next/image";
import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import styles from './PlatformBlock.module.scss';
import Platform1 from '@/app/assets/images/platform/1.png';
import Platform2 from '@/app/assets/images/platform/2.png';
import Platform3 from '@/app/assets/images/platform/3.png';
import { ReactNode } from "react";
interface PlatformBlockProps {
    description: string | ReactNode;
    tag: string;
    image: StaticImageData | string;
}


export default function PlatformBlock({
    description,
    tag,
    image
}:PlatformBlockProps) {
    return (
        <BlockWrapper id="product" customClass={styles.block__platform} spacing="top" size="narrow">
            <Image className={`${styles.platform__decor} ${styles['platform__decor-top']}`} src={Platform1} alt="Platform Decor One"/>
            <Image className={`${styles.platform__decor} ${styles['platform__decor-midle']}`} src={Platform2} alt="Platform Decor Two"/>
            <Image className={`${styles.platform__decor} ${styles['platform__decor-bottom']}`} src={Platform3} alt="Platform Decor Three"/>
            <div className={styles.platform}>
                <div className={styles.platform__head}>
                    <div className="tag text text--small">
                        {tag}
                    </div>
                    <p className="text text--giant">
                        {description}
                    </p>
                </div>
                <Image
                    src={image}
                    alt="Viral Bridge SEO growth dashboard"
                    unoptimized
                    sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1200px) calc(100vw - 80px), 1430px"
                />
            </div>
        </BlockWrapper>
    )
}
