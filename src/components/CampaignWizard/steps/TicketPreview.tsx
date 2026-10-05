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
  const { asset } = props.content;
  if (asset) {
    // Retail Media: the supplier's finished artwork, shown as delivered and fitted to the screen.
    const height = (props.displayWidth * props.height) / props.width;
    return (
      <div style={{ width: props.displayWidth, height, background: '#111', overflow: 'hidden' }}>
        {asset.type === 'video' ? (
          <video src={asset.url} muted autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
    );
  }
  const pack = getClientPack(clientId);
  if (pack.renderer === 'food-villa') return <FoodVillaTicket {...props} />;
  return <GenericTicket pack={pack} {...props} />;
};

export default TicketPreview;
