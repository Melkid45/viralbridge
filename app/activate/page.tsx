import ActivationForm from './ActivationForm';
import styles from '@/app/_components/_auth/AuthForms.module.scss';

export const dynamic = 'force-dynamic';

export default async function ActivatePage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token = '' } = await searchParams;

    return (
        <main className={styles.authPage}>
            <section className={styles.authCard}>
                <h1>Create your password</h1>
                <p>The invitation is single-use. Use at least 12 characters.</p>
                <ActivationForm token={token} />
            </section>
        </main>
    );
}
