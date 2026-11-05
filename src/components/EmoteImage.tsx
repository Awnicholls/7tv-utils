import type { ReactNode } from 'react';

import { emoteImageUrl } from '../utils/sevenTvUrls';

export const EmoteImage = ({
  id,
  size = 28,
}: {
  id: string;
  size?: number;
}): ReactNode => (
  <img
    alt=""
    className="emote-img"
    decoding="async"
    height={size}
    loading="lazy"
    src={emoteImageUrl(id)}
    style={{ height: size, width: size }}
    width={size}
  />
);
