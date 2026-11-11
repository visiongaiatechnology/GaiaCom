import React from 'react';
import Icon from '../../ui/Icon';

/**
 * VGT GLASS 2100 — sticky head of the list rail.
 *
 * Shows: mobile navigation/compose actions, the scope eyebrow, the page title,
 * an honest item count from props, the compose action and the collapse control.
 * Pure presentation; every handler is owned by ListPane.
 */
export default function ListPaneHeader({
  t,
  title,
  scope,
  count,
  canComposeMail,
  onStartCompose,
  onOpenMenu,
  onCollapse,
  titleLevel = 'h2'
}) {
  const composeLabel = (typeof t === 'function' && (t('mail_compose') || 'Schreiben')) || 'Schreiben';
  const menuLabel = (typeof t === 'function' && (t('menu') || 'Menü')) || 'Menü';
  const countLabel = count === null || count === undefined ? null : String(count);

  React.useEffect(() => {
    const reset = () => {
      document.querySelectorAll('.vgt-inbox__segments, .vgt-inbox__toolbar, .vgt-inbox__scope')
        .forEach((node) => { node.scrollLeft = 0; });
    };
    reset();
    const id = window.setTimeout(reset, 250);
    return () => window.clearTimeout(id);
  }, [title, scope]);

  return (
    <header className="vgt-inbox__head">
      <div className="mobile-pane-actions vgt-inbox__mobile-actions">
        <button
          type="button"
          className="btn-action mobile-menu-toggle vgt-inbox__menu-toggle"
          onClick={onOpenMenu}
          aria-label={menuLabel}
        >
          <Icon name="menu" size={18} />
          <span className="vgt-inbox__menu-toggle-text">{menuLabel}</span>
        </button>
        {canComposeMail ? (
          <button
            type="button"
            className="btn-primary mobile-compose-btn"
            onClick={onStartCompose}
          >
            <Icon name="plus" size={16} />
            <span>{composeLabel}</span>
          </button>
        ) : null}
      </div>

      <div className="vgt-inbox__title-row">
        <div className="vgt-inbox__title-block">
          {scope ? <span className="vgt-eyebrow vgt-inbox__scope">{scope}</span> : null}
          {/* Exactly one h1 per mail route: the mail list title is the route
              heading; non-mail routes keep h2 so content-pane h1s stay unique. */}
          {titleLevel === 'h1' ? (
            <h1 className="vgt-inbox__title" id="vgt-inbox-title">{String(scope || '').toUpperCase().includes('POSTFACH') ? 'GaiaMail' : title}</h1>
          ) : (
            <h2 className="vgt-inbox__title" id="vgt-inbox-title">{String(scope || '').toUpperCase().includes('POSTFACH') ? 'GaiaMail' : title}</h2>
          )}
        </div>
        <div className="vgt-inbox__title-actions">
          {countLabel !== null ? (
            <span
              className="vgt-inbox__count vgt-numeric"
              aria-label={`${countLabel} Einträge`}
              title={`${countLabel} Einträge`}
            >
              {countLabel}
            </span>
          ) : null}
          {canComposeMail ? (
            <button
              type="button"
              className="btn-primary desktop-compose-btn vgt-inbox__compose"
              onClick={onStartCompose}
            >
              <Icon name="plus" size={16} />
              <span>{composeLabel}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="btn-icon collapse-toggle-btn vgt-inbox__collapse"
            onClick={onCollapse}
            title="Liste einklappen"
            aria-label="Liste einklappen"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
