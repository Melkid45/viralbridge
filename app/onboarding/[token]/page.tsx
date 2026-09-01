import OnboardingChat from './OnboardingChat';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    return (
        <main className={styles.page}>
            <section className={styles.shell}>
                <div className={styles.intro}>
                    <span>Viral Bridge onboarding</span>
                    <h1>Your application is under review.</h1>
                    <p>
                        We research your company, market reach and growth potential. You can close
                        this page — the final decision will be sent to your email.
                    </p>
                </div>
                <OnboardingChat token={token} />
            </section>
        </main>
    );
}
