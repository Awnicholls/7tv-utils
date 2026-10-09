import type { SetState } from '../types/copier';

export const describeSet = (state: SetState): string | undefined => {
  switch (state.status) {
    case 'error': {
      return state.error;
    }
    case 'idle': {
      return undefined;
    }
    case 'loading': {
      return 'Looking up…';
    }
    case 'ok': {
      const { capacity, emotes, name, owner } = state.set;
      const count =
        capacity === null
          ? `${emotes.length} emotes`
          : `${emotes.length}/${capacity} emotes`;
      return `${name}${owner ? ` by ${owner}` : ''} · ${count}`;
    }
  }
};
