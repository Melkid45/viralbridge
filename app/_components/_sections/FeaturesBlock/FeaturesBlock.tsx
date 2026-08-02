import BlockWrapper from "../../_general/BlockWrapper/BlockWrapper";
import TitleBlock from "../../_general/TitleBlock/TitleBlock";
import styles from "./FeaturesBlock.module.scss";

function ContextVisual() {
    return (
        <svg className={styles.diagram} viewBox="0 0 420 270" aria-hidden="true">
            <g className={styles.diagram__grid}>
                <path d="M34 224H386" />
                <path d="M64 239H356" />
                <path d="M94 254H326" />
            </g>
            <g className={styles.diagram__primary}>
                <path className={styles.diagram__surface} d="M74 176 210 104l136 72-136 72L74 176Z" />
                <path className={styles.diagram__surface} d="M74 146 210 74l136 72-136 72L74 146Z" />
                <path className={styles.diagram__surface} d="M74 116 210 44l136 72-136 72L74 116Z" />
                <path d="m126 116 84-44 84 44-84 44-84-44Z" />
                <path d="M210 72v88" />
                <path d="m126 116 84 44 84-44" />
            </g>
            <g className={styles.diagram__accent}>
                <circle cx="210" cy="72" r="5" />
                <circle cx="126" cy="116" r="5" />
                <circle cx="294" cy="116" r="5" />
                <circle cx="210" cy="160" r="5" />
            </g>
        </svg>
    );
}

function AgentsVisual() {
    return (
        <svg className={styles.diagram} viewBox="0 0 420 270" aria-hidden="true">
            <g className={styles.diagram__grid}>
                <path d="M48 135H372" />
                <path d="M210 22v226" />
                <circle cx="210" cy="135" r="104" />
            </g>
            <g className={styles.diagram__primary}>
                <path d="M132 81 210 36l78 45v90l-78 45-78-45V81Z" />
                <path d="m132 81 78 45 78-45" />
                <path d="M210 126v90" />
                <path className={styles.diagram__surface} d="m164 108 46-27 46 27v54l-46 27-46-27v-54Z" />
                <path d="m164 108 46 27 46-27" />
                <path d="M210 135v54" />
            </g>
            <g className={styles.diagram__accent}>
                <circle cx="210" cy="36" r="5" />
                <circle cx="288" cy="81" r="5" />
                <circle cx="288" cy="171" r="5" />
                <circle cx="210" cy="216" r="5" />
                <circle cx="132" cy="171" r="5" />
                <circle cx="132" cy="81" r="5" />
                <circle cx="210" cy="135" r="7" />
            </g>
        </svg>
    );
}

function SpeedVisual() {
    return (
        <svg className={styles.diagram} viewBox="0 0 420 270" aria-hidden="true">
            <g className={styles.diagram__grid}>
                <path d="M48 68H372" />
                <path d="M48 135H372" />
                <path d="M48 202H372" />
            </g>
            <g className={styles.diagram__primary}>
                <path d="M73 202c34-1 48-18 71-67 23-48 39-67 78-67h125" />
                <path d="M73 202h87c45 0 59-17 82-67 23-49 39-67 105-67" />
                <path d="M73 202h154c39 0 56-18 77-67 21-49 31-67 43-67" />
                <path className={styles.diagram__surface} d="m329 50 28 18-28 18 9-18-9-18Z" />
                <path className={styles.diagram__surface} d="m329 117 28 18-28 18 9-18-9-18Z" />
                <path className={styles.diagram__surface} d="m329 184 28 18-28 18 9-18-9-18Z" />
            </g>
            <g className={styles.diagram__accent}>
                <circle cx="73" cy="202" r="6" />
                <circle cx="144" cy="135" r="5" />
                <circle cx="222" cy="68" r="5" />
                <circle cx="242" cy="135" r="5" />
                <circle cx="304" cy="135" r="5" />
            </g>
        </svg>
    );
}

const features = [
    {
        figure: "FIG 0.1",
        title: "Context that compounds",
        description: "Every audit, decision, and result becomes reusable context for the next action.",
        visual: <ContextVisual />,
    },
    {
        figure: "FIG 0.2",
        title: "Agents that execute",
        description: "Specialized agents research, plan, create, and coordinate work across your channels.",
        visual: <AgentsVisual />,
    },
    {
        figure: "FIG 0.3",
        title: "Built to move faster",
        description: "Automated routing, approvals, and reporting keep work moving without constant follow-up.",
        visual: <SpeedVisual />,
    },
];

export default function FeaturesBlock() {
    return (
        <BlockWrapper spacing="top">
            <div className={styles.features}>
                <TitleBlock
                    title="Features"
                    softTitle="Platform advantages"
                    number="02"
                />

                <p className={styles.features__statement}>
                    SEO should not create more busywork. <span>Viral Scale turns research, strategy, and execution into one continuous AI workflow.</span>
                </p>

                <div className={styles.features__grid}>
                    {features.map((feature) => (
                        <article className={styles.features__card} key={feature.title}>
                            <div className={styles.features__meta}>
                                <span>{feature.figure}</span>
                                <span className={styles.features__status}>SYSTEM ONLINE</span>
                            </div>
                            <div className={styles.features__visual}>{feature.visual}</div>
                            <div className={styles.features__copy}>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </BlockWrapper>
    );
}
