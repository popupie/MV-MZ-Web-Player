const githubUrl = "https://github.com/popupie/MV-MZ-Browser-Player";

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="about-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="about-title">MV/MZ Web Player</h2>
            <p>A browser-only player for local RPG Maker MV/MZ web exports.</p>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-section">
          <h3>How to Use</h3>
          <ol>
            <li>Import an RPG Maker MV/MZ web export folder or ZIP.</li>
            <li>Select a game from the library.</li>
            <li>Use the Overlay for transparent selectable text.</li>
            <li>Enable Show to make overlay text visible.</li>
            <li>
              Use Dismiss guard if your dictionary popup needs a safe closing
              click.
            </li>
          </ol>
        </div>

        <div className="modal-section">
          <h3>Privacy</h3>
          <p>
            Your game runs entirely in your browser. No files are uploaded,
            stored on a server, or tracked. This is a static website with no
            backend
          </p>
        </div>

        <div className="modal-section">
          <h3>About</h3>
          <p>
            Unofficial player for user-provided RPG Maker MV/MZ web exports,
            designed for convenient local play and text extraction.
          </p>
          <p>
            Not affiliated with or endorsed by Gotcha Gotcha Games, KADOKAWA, or
            Degica.
          </p>
          <a href={githubUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </section>
    </div>
  );
}
