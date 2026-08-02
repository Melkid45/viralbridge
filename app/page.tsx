import HeroBlock from "./_components/_sections/HeroBlock/HeroBlock";
import PartnersBlock from "./_components/_sections/PartnersBlock/PartnersBlock";
import FeaturesBlock from "./_components/_sections/FeaturesBlock/FeaturesBlock";
import ProcessBlock from "./_components/_sections/ProcessBlock/ProcessBlock";
import Partner1 from '@/app/assets/images/partners/1.svg';
import Partner2 from '@/app/assets/images/partners/2.svg';
import Partner3 from '@/app/assets/images/partners/3.svg';
import Partner4 from '@/app/assets/images/partners/4.svg';
export default function Page() {
  return (
    <>
    <HeroBlock
      items={[
        {
          text: 'Web design'
        },
        {
          text: 'Branding'
        },
        {
          text: 'Content'
        },
        {
          text: 'Social media'
        },
      ]}
      softTitle="We are ViralBridge"
      description="Not just a studio, we are Strategic."
    />
    <PartnersBlock
      title="Partners"
      softText="Our partners"
      partners={[
        {
          logo: Partner1,
          title: 'Total Transport',
          description: 'Lorem ipsum dolor sit amet, consectetur.',
        },
        {
          logo: Partner2,
          title: 'airBaltic',
          description: 'Lorem ipsum dolor sit amet, consectetur.',
        },
        {
          logo: Partner3,
          title: 'Vave',
          description: 'Lorem ipsum dolor sit amet, consectetur.',
        },
        {
          logo: Partner4,
          title: 'Stefano Ricchi',
          description: 'Lorem ipsum dolor sit amet, consectetur.',
        },
      ]}
    />
    <FeaturesBlock />
    <ProcessBlock />
    </>
  )
}
