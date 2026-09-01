import Image from 'next/image';
import Link from 'next/link';
import Logo from '@/app/assets/images/logo.svg';
import Container from '../Container/Container';
import Button from '../Button/Button';
import styles from './Footer.module.scss';

const navigation = [
    { label: 'Product', href: '/#product' },
    { label: 'How it works', href: '/#how' },
    { label: 'Prices', href: '/#prices' },
    { label: 'FAQ', href: '/#faq' },
    { label: 'Contact', href: '/#contact' }
];

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <Container>
                <div className={styles.footer__top}>
                    <Link href="/" className={styles.footer__logo}><Image src={Logo} alt="ViralBridge" /></Link>
                    <nav aria-label="Footer navigation">
                        <ul>
                            {navigation.map((item) => (
                                <li key={item.href}>
                                    <Link href={item.href}>
                                        <span className={styles.footer__linkText}>
                                            <span>{item.label}</span>
                                            <span aria-hidden="true">{item.label}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <Button link="/#contact" variant="accent" round="full">Run your scan</Button>
                </div>
                <div className={styles.footer__bottom}>
                    <span>© {new Date().getFullYear()} ViralBridge</span>
                    <div>
                        <Link href="#">Privacy Policy</Link>
                        <Link href="#">Careers</Link>
                        <Link href="#">Press</Link>
                    </div>
                </div>
            </Container>
        </footer>
    );
}
