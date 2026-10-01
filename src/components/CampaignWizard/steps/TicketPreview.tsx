import React from 'react';
import { getClientPack } from '../clients';
import FoodVillaTicket from './FoodVillaTicket';
import type { FoodVillaTicketProps } from './FoodVillaTicket';
import GenericTicket from './GenericTicket';

export interface TicketPreviewProps extends FoodVillaTicketProps {
  clientId: string;
}

/**
 * Draws a ticket with the renderer of the client's template pack. Each client has its own
 * designs, fonts and renderer; screens use this component and never a client renderer directly.
 */
const TicketPreview: React.FC<TicketPreviewProps> = ({ clientId, ...props }) => {
  const pack = getClientPack(clientId);
  if (pack.renderer === 'food-villa') return <FoodVillaTicket {...props} />;
  return <GenericTicket pack={pack} {...props} />;
};

export default TicketPreview;
