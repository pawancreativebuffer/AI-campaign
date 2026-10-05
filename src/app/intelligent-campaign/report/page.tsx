import { Suspense } from 'react';
import Header from '@/components/Header';
import ReportLoader from './ReportLoader';

export default function CampaignReportPage() {
  return (
    <main>
      <Header />
      {/* useSearchParams (?id=<id>) needs a Suspense boundary in the app router. */}
      <Suspense fallback={null}>
        <ReportLoader />
      </Suspense>
    </main>
  );
}
