import LoginForm from './LoginForm';
import styles from '@/app/_components/_auth/AuthForms.module.scss';

export default function LoginPage() {
    return (
        <main className={styles.authPage}>
            <section className={styles.authCard}>
                <h1>Welcome back</h1>
                <p>Sign in with the email used in your Viral Bridge application.</p>
                <LoginForm />
            </section>
        </main>
    );
}
