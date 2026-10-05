import { Suspense } from 'react';
import Header from '@/components/Header';
import ViewLoader from './ViewLoader';

export default function CampaignViewPage() {
  return (
    <main>
      <Header />
      {/* useSearchParams (?id=<id>) needs a Suspense boundary in the app router. */}
      <Suspense fallback={null}>
        <ViewLoader />
      </Suspense>
    </main>
  );
}
