import type { KeyboardEvent } from "react";
import type { DictionaryDismissGuard, GameRecord } from "../lib/types";
import { chordLabel } from "../lib/keyChords";
import { Icon } from "./Icon";

interface DictionaryGuardPanelProps {
  activeGame?: GameRecord;
  guard: DictionaryDismissGuard;
  onRecordTrigger: (game: GameRecord, event: KeyboardEvent) => void;
  onRemoveTrigger: (game: GameRecord, index: number) => void;
  onToggle: (game: GameRecord, guard: DictionaryDismissGuard) => void;
  recording: boolean;
  setRecording: (recording: boolean) => void;
}

export function DictionaryGuardPanel({
  activeGame,
  guard,
  onRecordTrigger,
  onRemoveTrigger,
  onToggle,
  recording,
  setRecording,
}: DictionaryGuardPanelProps) {
  return (
    <section className="guard-popover" aria-label="Dictionary dismiss guard settings">
      <div className="guard-row">
        <span>Dismiss guard</span>
        <button
          type="button"
          aria-label="Dictionary dismiss guard"
          title="Dictionary dismiss guard"
          aria-pressed={guard.enabled}
          disabled={!activeGame}
          onClick={() => activeGame && onToggle(activeGame, { ...guard, enabled: !guard.enabled })}
        >
          {guard.enabled ? "On" : "Off"}
        </button>
      </div>
      <div className="guard-chips">
        {guard.triggers.map((trigger, index) => {
          const label = chordLabel(trigger);
          return (
            <button className="guard-chip removable" key={`${label}:${index}`} type="button" disabled={!activeGame} onClick={() => activeGame && onRemoveTrigger(activeGame, index)}>
              <span>{label}</span>
              <Icon name="x" />
            </button>
          );
        })}
        <button
          type="button"
          className={recording ? "guard-add-button recording" : "guard-add-button"}
          aria-label="Add dictionary trigger"
          title="Add dictionary trigger"
          aria-pressed={recording}
          disabled={!activeGame}
          onClick={(event) => {
            setRecording(true);
            event.currentTarget.focus();
          }}
          onKeyDown={(event) => activeGame && onRecordTrigger(activeGame, event)}
        >
          <Icon name="plus" />
        </button>
      </div>
    </section>
  );
}
