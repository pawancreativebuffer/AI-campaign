'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import CampaignWizard from '@/components/CampaignWizard/CampaignWizard';
import CampaignNotFound from '@/components/CampaignReport/CampaignNotFound';
import { useSavedCampaign } from '@/components/CampaignWizard/campaignStore';

/** A new campaign, or with ?edit=<id> the saved wizard campaign loaded into the wizard. */
const WizardLoader: React.FC = () => {
  const editId = useSearchParams().get('edit');
  if (!editId) return <CampaignWizard />;
  return <EditCampaign id={editId} />;
};

const EditCampaign: React.FC<{ id: string }> = ({ id }) => {
  const { ready, campaign } = useSavedCampaign(id);
  // The first render uses the empty server snapshot; wait for sessionStorage before deciding.
  if (!ready) return null;
  if (!campaign?.draft) return <CampaignNotFound id={id} title="Edit Campaign" />;
  // Keyed so the wizard mounts fresh with the loaded draft as its initial state.
  return <CampaignWizard key={campaign.id} initialDraft={campaign.draft} />;
};

export default WizardLoader;
