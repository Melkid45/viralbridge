import Image, { StaticImageData } from "next/image";
import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import styles from './HeroBlock.module.scss';
import { ArrowRight } from "lucide-react";
import { ReactNode } from "react";
import Button from "../../_general/Button/Button";
import TypingText from "./TypingText";
interface HeroBlockProps {
    title: string | ReactNode;
    button: string;
    image: StaticImageData | string;
    helloTexts: string[];
}

export default function HeroBlock({
    title,
    button,
    image,
    helloTexts
}:HeroBlockProps) {
    return (
        <BlockWrapper id="main" spacing="hero" customClass={styles.block__hero} container={false}>
            <div className={styles.hero}>
                <Image
                    src={image}
                    alt="Abstract AI growth signal network"
                    fill
                    priority
                    unoptimized
                    sizes="calc(100vw - 64px)"
                />
                <div className={styles.hero__body}>
                    <h1 className="heading heading--large">
                        {title}
                    </h1>
                    <div className={styles['hero__body-hello']}>
                        <p className="text text--small text--color-white text--opacity-60">
                            <TypingText phrases={helloTexts} />
                        </p>
                        <a className={styles.hello__link} href="/#contact" aria-label="Go to the first scan form">
                            <ArrowRight/>
                        </a>
                    </div>
                </div>
                <Button link="/#contact" variant="accent" round="full" size="large">
                    {button}
                </Button>
            </div>
        </BlockWrapper>
    )
}
