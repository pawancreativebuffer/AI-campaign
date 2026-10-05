'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import CampaignView from '@/components/CampaignView/CampaignView';
import CampaignNotFound from '@/components/CampaignReport/CampaignNotFound';
import { useSavedCampaign } from '@/components/CampaignWizard/campaignStore';

/** Loads the saved wizard campaign named by ?id=<id> and shows what plays where. */
const ViewLoader: React.FC = () => {
  const id = useSearchParams().get('id') ?? '';
  const { ready, campaign } = useSavedCampaign(id);
  // The first render uses the empty server snapshot; wait for sessionStorage.
  if (!ready) return null;
  if (!campaign?.draft) return <CampaignNotFound id={id} title="View Campaign" />;
  return <CampaignView draft={campaign.draft} />;
};

export default ViewLoader;
