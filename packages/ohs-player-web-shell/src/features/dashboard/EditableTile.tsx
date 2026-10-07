import { useTranslation } from 'ohs-player-web-core';
import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from '../../components/ui';
import { IconArrowDown, IconArrowUp, IconClose } from '../../components/ui/icons';

export type MoveDirection = -1 | 1;

export interface FocusRequest {
  id: string;
  direction: MoveDirection;
}

export interface EditableTileProps {
  title: string;
  first: boolean;
  last: boolean;
  focusRequest?: FocusRequest;
  onMove: (direction: MoveDirection) => void;
  onRemove: () => void;
  children: ReactNode;
}

/** A dashboard card in edit mode, with move up, move down and remove controls above it. */
export function EditableTile({
  title,
  first,
  last,
  focusRequest,
  onMove,
  onRemove,
  children,
}: Readonly<EditableTileProps>): ReactNode {
  const { t } = useTranslation();
  const up = useRef<HTMLButtonElement>(null);
  const down = useRef<HTMLButtonElement>(null);
  const remove = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!focusRequest) return;
    const preferred = focusRequest.direction === -1 ? up.current : down.current;
    const target = [preferred, up.current, down.current, remove.current].find(
      (button) => button && !button.disabled,
    );
    target?.focus();
  }, [focusRequest]);

  return (
    <div className="ohs-dash-tile">
      <div className="ohs-dash-tile__bar" role="group" aria-label={title}>
        <IconButton
          ref={up}
          label={t('widgetMoveUp', { title })}
          disabled={first}
          onClick={() => onMove(-1)}
        >
          <IconArrowUp size={20} />
        </IconButton>
        <IconButton
          ref={down}
          label={t('widgetMoveDown', { title })}
          disabled={last}
          onClick={() => onMove(1)}
        >
          <IconArrowDown size={20} />
        </IconButton>
        <IconButton ref={remove} label={t('widgetRemove', { title })} onClick={onRemove}>
          <IconClose size={20} />
        </IconButton>
      </div>
      {children}
    </div>
  );
}
