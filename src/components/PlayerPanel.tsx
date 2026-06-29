import type { CSSProperties, RefObject } from "react";
import { playUrl } from "../lib/playerUrls";
import type { GameRecord } from "../lib/types";
import { Icon } from "./Icon";
import { TextLogPanel } from "./TextLogPanel";

interface PlayerPanelProps {
  activeGame?: GameRecord;
  focusPlayer: () => void;
  frameRef: RefObject<HTMLIFrameElement | null>;
  frameWrapRef: RefObject<HTMLDivElement | null>;
  gameAspectRatio: number;
  logsOpen: boolean;
  onIframeLoad: () => void;
  onRequestFullscreen: () => void;
  onToggleOverlay: (game: GameRecord) => void;
  onToggleShow: (game: GameRecord) => void;
  resetRuntimeError: () => void;
  runtimeError: string | null;
  setLogsOpen: (open: boolean | ((open: boolean) => boolean)) => void;
  textLogLimit: number;
  textLogs: string[];
}

export function PlayerPanel({
  activeGame,
  focusPlayer,
  frameRef,
  frameWrapRef,
  gameAspectRatio,
  logsOpen,
  onIframeLoad,
  onRequestFullscreen,
  onToggleOverlay,
  onToggleShow,
  resetRuntimeError,
  runtimeError,
  setLogsOpen,
  textLogLimit,
  textLogs,
}: PlayerPanelProps) {
  return (
    <section className="player-panel" aria-label="Player">
      {activeGame && (
        <>
          <div className="player-toolbar">
            <div>
              <h2>{activeGame.title}</h2>
              <p>{activeGame.entryPath}</p>
            </div>
            <div className="tool-buttons">
              <button type="button" aria-label="Open text overlay" title="Open text overlay" aria-pressed={activeGame.settings.overlayEnabled} onClick={() => onToggleOverlay(activeGame)}>
                <Icon name="layers" />
              </button>
              {activeGame.settings.overlayEnabled && (
                <button
                  type="button"
                  className="show-mode-button"
                  aria-label="Show overlay text"
                  title="Show overlay text"
                  aria-pressed={Boolean(activeGame.settings.readableOverlay)}
                  onClick={() => onToggleShow(activeGame)}
                >
                  <Icon name="eye" />
                </button>
              )}
              <button type="button" aria-label="Focus game" title="Focus game" onClick={focusPlayer}>
                <Icon name="focus" />
              </button>
              <button type="button" aria-label="Fullscreen" title="Fullscreen" onClick={onRequestFullscreen}>
                <Icon name="fullscreen" />
              </button>
            </div>
          </div>
          <div className="player-scroll">
            {runtimeError && (
              <div className="runtime-error dismissible-alert">
                <span>{runtimeError}</span>
                <button type="button" aria-label="Dismiss error" title="Dismiss error" onClick={resetRuntimeError}>
                  <Icon name="x" />
                </button>
              </div>
            )}
            <div ref={frameWrapRef} className="frame-wrap" style={{ "--game-aspect-ratio": String(gameAspectRatio) } as CSSProperties}>
              <iframe
                key={`${activeGame.id}:${activeGame.entryPath}`}
                ref={frameRef}
                title={activeGame.title}
                src={playUrl(activeGame)}
                allow="fullscreen; autoplay"
                tabIndex={-1}
                onLoad={onIframeLoad}
              />
            </div>
            <TextLogPanel logsOpen={logsOpen} setLogsOpen={setLogsOpen} textLogLimit={textLogLimit} textLogs={textLogs} />
          </div>
        </>
      )}
    </section>
  );
}
