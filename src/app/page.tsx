"use client";

import React, { useState } from 'react';
import Header from '@/components/Header';
import SubHeader from '@/components/SubHeader';
import CampaignTable from '@/components/CampaignTable';
import BatchScreen from '@/components/BatchScreen';

export default function Home() {
  const [activeTab, setActiveTab] = useState('CAMPAIGNS');

  return (
    <main>
      <Header />
      <SubHeader activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'CAMPAIGNS' && <CampaignTable />}
      {activeTab === 'BATCHES' && <BatchScreen />}
    </main>
  );
}
