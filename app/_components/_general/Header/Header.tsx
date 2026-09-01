import Link from "next/link";
import Container from "../Container/Container";
import styles from './Header.module.scss';
import Button from "../Button/Button";
import { ArrowRight, Monitor } from "lucide-react";
import Image from "next/image";
import Logo from '@/app/assets/images/logo.svg';

interface HeaderLink {
    href: string;
    label: string;
}


interface HeaderProps {
    navigation?: HeaderLink[];
}


const navigationArray: HeaderLink[] = [
    {
        label: 'Main',
        href: '/#main'
    },
    {
        label: 'Product',
        href: '/#product'
    },
    {
        label: 'How it works',
        href: '/#how'
    },
    {
        label: 'Prices',
        href: '/#prices'
    },
    {
        label: 'FAQ',
        href: '/#faq'
    },
    {
        label: 'Contact',
        href: '/#contact'
    },
]


export default function Header({
    navigation = navigationArray
}: HeaderProps) {
    return (
        <header className={styles.header}>
            <Container>
                <div className={styles.header__body}>
                    <Link href={'/'} className={styles.header__logo}>
                        <Image src={Logo} alt="ViralBridge Logo"/>
                    </Link>
                    <div className={styles.header__action}>
                        {navigation && (
                            <nav className={styles.header__menu}>
                                <ul>
                                    {navigation.map((item) => (
                                        <li key={item.href} className={styles.header__link}>
                                            <Link href={item.href}>
                                                <span className={styles.header__linkText}>
                                                    <span>{item.label}</span>
                                                    <span aria-hidden="true">{item.label}</span>
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        )}
                        <Button link="/dashboard" variant="accent" round="full">
                            Get started
                        </Button>
                    </div>
                </div>
            </Container>
        </header>
    )
}
