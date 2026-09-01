import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import styles from '@/app/_components/_auth/AuthForms.module.scss';

export const dynamic = 'force-dynamic';

export default async function HelloPage() {
    const user = await getCurrentUser();
    if (!user) redirect('/login');

    return (
        <main className={styles.authPage}>
            <section className={`${styles.authCard} ${styles.helloCard}`}>
                <h1>Hello</h1>
                <strong>{user.email}</strong>
                <form action="/api/logout" method="post">
                    <button className={styles.logout} type="submit">Log out</button>
                </form>
            </section>
        </main>
    );
}
