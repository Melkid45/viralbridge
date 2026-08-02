"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, ClipboardList, ScanSearch, Workflow, type LucideIcon } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import TitleBlock from "../../_general/TitleBlock/TitleBlock";
import styles from "./ProcessBlock.module.scss";

interface ProcessStep {
    number: string;
    label: string;
    title: string;
    description: string;
    outcome: string;
    variant: string;
    icon: LucideIcon;
}

const steps: ProcessStep[] = [
    {
        number: "01",
        label: "≈ 3 MINUTES",
        title: "Brief the system",
        description: "Share your market, goals, voice, and constraints through one focused conversation.",
        outcome: "Context captured",
        variant: "brief",
        icon: ClipboardList,
    },
    {
        number: "02",
        label: "AUTO RESEARCH",
        title: "Build the intelligence",
        description: "Agents audit competitors, search demand, and opportunities, then form a working plan.",
        outcome: "Strategy assembled",
        variant: "intelligence",
        icon: ScanSearch,
    },
    {
        number: "03",
        label: "ALWAYS ON",
        title: "Keep execution moving",
        description: "Tasks, approvals, publishing, and reporting continue across every connected channel.",
        outcome: "Execution running",
        variant: "execution",
        icon: Workflow,
    },
];

export default function ProcessBlock() {
    const stageRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        const stage = stageRef.current;
        const cards = cardsRef.current;
        if (!stage || !cards) return;

        const cardElements = Array.from(cards.children) as HTMLElement[];
        const media = gsap.matchMedia();

        media.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
            gsap.set(cardElements[1], { y: 48 });
            gsap.set(cardElements[2], { y: 96 });

            const timeline = gsap.timeline({
                scrollTrigger: {
                    trigger: stage,
                    start: "top 72%",
                    end: "top 16%",
                    scrub: 0.85,
                    invalidateOnRefresh: true,
                },
            });

            timeline
                .to(cardElements[1], { y: 0, duration: 0.82, ease: "none" }, 0)
                .to(cardElements[2], { y: 0, duration: 1, ease: "none" }, 0);

            return () => timeline.kill();
        });

        return () => media.revert();
    }, []);

    return (
        <BlockWrapper spacing="top">
            <div className={styles.process}>
                <TitleBlock
                    title="How it works"
                    softTitle="From brief to scale"
                    number="03"
                />

                <div className={styles.process__intro}>
                    <h2>From a three-minute brief to continuous execution</h2>
                    <p>One short conversation gives the system enough context to research, decide, and keep the work moving.</p>
                </div>

                <div className={styles.process__stage} ref={stageRef}>
                    <div ref={cardsRef} className={styles.process__cards}>
                        {steps.map((step) => {
                            const Icon = step.icon;

                            return (
                                <article
                                    className={`${styles.process__card} ${styles[`process__card_${step.variant}`]}`}
                                    key={step.number}
                                >
                                    <div className={styles.process__cardHead}>
                                        <span>{step.number}</span>
                                        <span>{step.label}</span>
                                    </div>

                                    <div className={styles.process__icon}>
                                        <Icon size={30} strokeWidth={1.6} />
                                    </div>

                                    <div className={styles.process__copy}>
                                        <h3>{step.title}</h3>
                                        <p>{step.description}</p>
                                    </div>

                                    <div className={styles.process__outcome}>
                                        <span>{step.outcome}</span>
                                        <ArrowUpRight size={18} strokeWidth={1.7} />
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </div>
        </BlockWrapper>
    );
}
