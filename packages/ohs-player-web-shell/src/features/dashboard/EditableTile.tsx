import { useTranslation } from 'ohs-player-web-core';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { IconButton, Popover } from '../../components/ui';
import { IconArrowDown, IconArrowUp, IconClose, IconTune } from '../../components/ui/icons';

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
  /** The card's settings, labelled by the heading id it is given. Absent hides the button. */
  renderSettings?: (headingId: string) => ReactNode;
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
  renderSettings,
  children,
}: Readonly<EditableTileProps>): ReactNode {
  const { t } = useTranslation();
  const settingsHeadingId = useId();
  const [settingsOpen, setSettingsOpen] = useState(false);
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
        {renderSettings ? (
          <Popover
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            labelledBy={settingsHeadingId}
            trigger={
              <IconButton label={t('widgetSettings', { title })}>
                <IconTune size={20} />
              </IconButton>
            }
          >
            {renderSettings(settingsHeadingId)}
          </Popover>
        ) : null}
        <IconButton ref={remove} label={t('widgetRemove', { title })} onClick={onRemove}>
          <IconClose size={20} />
        </IconButton>
      </div>
      {children}
    </div>
  );
}
