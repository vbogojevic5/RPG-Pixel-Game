/** Prompt to save before returning to main menu; matches Save modal shell (modal-backdrop / modal). */
export default function LeaveRunModal({ onSaveFirst, onLeaveWithoutSaving, onDismiss }) {
  return (
    <div className="modal-backdrop" onClick={onDismiss}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-run-title"
      >
        <div className="modal__header modal__header--centered">
          <h3 className="modal__title" id="leave-run-title">
            Save your run?
          </h3>
        </div>
        <div className="modal__body">
          <p className="modal__body-text">
            Progress is kept in this browser session until you save to your account. Save now, or return
            to the menu and continue later from the last server save (if any).
          </p>
          <div className="modal__actions modal__actions--centered">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onLeaveWithoutSaving}
              data-sfx="modalClose"
            >
              Leave without saving
            </button>
            <button type="button" className="btn btn--primary" onClick={onSaveFirst} data-sfx="modalOpen">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
