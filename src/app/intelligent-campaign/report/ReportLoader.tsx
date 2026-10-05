'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import CampaignReport from '@/components/CampaignReport/CampaignReport';
import CampaignNotFound from '@/components/CampaignReport/CampaignNotFound';
import { useToday } from '@/components/CampaignReport/proofOfPlay';
import { useSavedCampaign } from '@/components/CampaignWizard/campaignStore';

/** Loads the saved wizard campaign named by ?id=<id> and shows its proof-of-play report. */
const ReportLoader: React.FC = () => {
  const id = useSearchParams().get('id') ?? '';
  const { ready, campaign } = useSavedCampaign(id);
  const today = useToday();
  // The first render uses the empty server snapshots; wait for sessionStorage and the client date.
  if (!ready || !today) return null;
  if (!campaign?.draft) return <CampaignNotFound id={id} title="Proof of Play Report" />;
  return <CampaignReport draft={campaign.draft} today={today} />;
};

export default ReportLoader;
