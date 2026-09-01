import Partner1 from '@/app/assets/images/partners/1.svg';
import Partner2 from '@/app/assets/images/partners/2.svg';
import Partner3 from '@/app/assets/images/partners/3.svg';
import Partner4 from '@/app/assets/images/partners/4.svg';
import Partner5 from '@/app/assets/images/partners/5.svg';
import HeroBlock from './_components/_sections/HeroBlock/HeroBlock';
import PartnersBlock from './_components/_sections/PartnersBlock/PartnersBlock';
import PlatformBlock from './_components/_sections/PlatformBlock/PlatformBlock';
import PlatformImage from '@/app/assets/images/platform.png';
import GrowthCycleBlock from './_components/_sections/GrowthCycleBlock/GrowthCycleBlock';
import OutcomesBlock from './_components/_sections/OutcomesBlock/OutcomesBlock';
import ComparisonBlock from './_components/_sections/ComparisonBlock/ComparisonBlock';
import FaqBlock from './_components/_sections/FaqBlock/FaqBlock';
import Footer from './_components/_general/Footer/Footer';
import AdvantagesBlock from './_components/_sections/AdvantagesBlock/AdvantagesBlock';
import PricingBlock from './_components/_sections/PricingBlock/PricingBlock';
import RequestBlock from './_components/_sections/RequestBlock/RequestBlock';
import HeroImage from '@/app/assets/images/hero.png';
export default function Page() {
  return (
    <>
      <HeroBlock
        title={<>Growth keeps moving <br /> while you build the business</>}
        helloTexts={[
          'Analyze my business “Bulava” and find its strongest SEO growth opportunities.',
          'Audit anselat.lv and show what is holding its organic growth back.',
          'Build a 30-day content plan around high-intent search demand.',
        ]}
        image={HeroImage}
        button='See a sample audit'
      />
      <PartnersBlock
        title='Trusted by growth-focused teams'
        partners={[
          { logo: Partner1, name: '' },
          { logo: Partner2, name: '' },
          { logo: Partner3, name: '' },
          { logo: Partner4, name: '' },
          { logo: Partner5, name: '' },
        ]}
      />
      <PlatformBlock
        tag='Platform'
        description={<>
          <span>The growth system that never sleeps.</span> <br />
          Finds demand before it peaks. Fixes weak signals before they compound. Surfaces the next move before you ask.
        </>}
        image={PlatformImage}
      />
      <GrowthCycleBlock />
      <OutcomesBlock />
      <ComparisonBlock />
      <AdvantagesBlock
        tag='Advantages'
        title='What Viralbridge keeps running'
      />
      <PricingBlock
        tag='Plans'
        title='Plans that scale with you.'
      />
      <RequestBlock
        title='Show us the company We’ll show you what should move next.'
        description='Enter the company name and work email to begin the first scan.'
        list={[
          {text: 'Takes 2 minutes'},
          {text: 'No platform'},
          {text: 'Get first finding to your email'},
        ]}
      />
      <FaqBlock />
      <Footer />
    </>
  )
}
