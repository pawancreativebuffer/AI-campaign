import { Suspense } from 'react';
import Header from '@/components/Header';
import WizardLoader from './WizardLoader';

export default function IntelligentCampaignPage() {
  return (
    <main>
      <Header />
      {/* useSearchParams (?edit=<id>) needs a Suspense boundary in the app router. */}
      <Suspense fallback={null}>
        <WizardLoader />
      </Suspense>
    </main>
  );
}
