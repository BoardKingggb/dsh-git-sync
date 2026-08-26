import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The git-sync plugin's settings card: toggle the master switch, set the GitHub
 * remote, branch, interval, and auto-create flag, and save them into the
 * `git-sync` settings namespace.
 * @module @deepseek-ai/dsh-client-ui-git-sync/GitSyncCard
 */
import { useState } from 'react';
const cardStyle = {
    border: '1px solid rgba(128,128,128,0.25)',
    borderRadius: 8,
    margin: '8px 0',
    background: 'rgba(128,128,128,0.06)',
};
const headerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
};
const titleStyle = { fontWeight: 600 };
const descStyle = { fontSize: 12, opacity: 0.7 };
const pendingStyle = { fontSize: 12, color: '#e5a93d' };
const bodyStyle = { padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 };
const rowStyle = { display: 'flex', alignItems: 'center', gap: 8 };
const labelStyle = { flex: '0 0 180px', fontSize: 13 };
const inputStyle = {
    flex: 1,
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid rgba(128,128,128,0.35)',
    background: 'rgba(0,0,0,0.15)',
    color: 'inherit',
    font: 'inherit',
};
const hintStyle = { fontSize: 11, opacity: 0.6, marginLeft: 188 };
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 };
const buttonStyle = { padding: '5px 14px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.35)', background: 'transparent', color: 'inherit', cursor: 'pointer' };
const saveButtonStyle = { ...buttonStyle, background: 'rgba(79,140,255,0.85)', color: '#fff', border: 'none' };
const smallButtonStyle = { ...buttonStyle, padding: '3px 10px', fontSize: 12 };
const loginButtonStyle = { ...saveButtonStyle, padding: '3px 10px', fontSize: 12 };
const statusStyle = { fontSize: 13, fontWeight: 600 };
const noteStyle = { fontSize: 12, color: '#e05e5e' };
function TextField(props) {
    return (_jsxs("div", { children: [_jsxs("div", { style: rowStyle, children: [_jsx("label", { style: labelStyle, htmlFor: props.id, children: props.label }), _jsx("input", { id: props.id, type: "text", style: inputStyle, value: String(props.value.value), onChange: event => { props.onEdit(event.currentTarget.value); } })] }), props.hint !== undefined ? _jsx("div", { style: hintStyle, children: props.hint }) : null] }));
}
function NumberField(props) {
    return (_jsxs("div", { style: rowStyle, children: [_jsx("label", { style: labelStyle, htmlFor: props.id, children: props.label }), _jsx("input", { id: props.id, type: "text", inputMode: "numeric", style: inputStyle, value: String(props.value.value), onChange: event => {
                    const text = event.currentTarget.value;
                    const parsed = Number(text);
                    props.onEdit(Number.isFinite(parsed) && text.trim() !== '' ? parsed : text);
                } })] }));
}
function BoolField(props) {
    return (_jsxs("div", { style: rowStyle, children: [_jsx("label", { style: labelStyle, htmlFor: props.id, children: props.label }), _jsx("input", { id: props.id, type: "checkbox", checked: props.value.value === true, onChange: event => { props.onEdit(event.currentTarget.checked); } })] }));
}
/**
 * Render the git-sync settings card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card, or nothing when the namespace is not served.
 */
export function GitSyncCard(props) {
    const { t } = props;
    const state = props.useGitSyncCard(snapshot => snapshot);
    const [open, setOpen] = useState(false);
    if (!state.available)
        return null;
    const disabled = !state.writable;
    let statusText;
    let statusColor = '#9aa2b1';
    switch (state.authStatus) {
        case 'logged-in':
            statusText = t('auth.status.logged-in');
            statusColor = '#3ecf8e';
            break;
        case 'not-logged-in':
            statusText = t('auth.status.not-logged-in');
            statusColor = '#e05e5e';
            break;
        case 'unknown':
            statusText = t('auth.status.unknown');
            break;
        default:
            statusText = state.authStatus.startsWith('opening') ? t('auth.status.opening') : state.authStatus;
            break;
    }
    return (_jsxs("li", { style: cardStyle, children: [_jsxs("button", { type: "button", style: headerStyle, "aria-expanded": open, "aria-label": `${t(open ? 'state.collapse' : 'state.expand')}: ${t('card.title')}`, onClick: () => { setOpen(!open); }, children: [_jsx("span", { style: titleStyle, children: t('card.title') }), _jsx("span", { style: descStyle, children: t('card.description') }), state.dirty ? _jsx("span", { style: pendingStyle, children: t('state.unsaved') }) : null] }), open
                ? (_jsxs("div", { style: bodyStyle, children: [!state.writable ? _jsx("p", { style: noteStyle, children: t('state.readOnly') }) : null, _jsxs("div", { style: rowStyle, children: [_jsx("span", { style: labelStyle, children: t('auth.status') }), _jsx("span", { style: { ...statusStyle, color: statusColor }, children: statusText }), _jsx("button", { type: "button", style: smallButtonStyle, onClick: props.refreshStatus, children: t('action.refreshStatus') }), _jsx("button", { type: "button", style: loginButtonStyle, onClick: props.login, children: t('action.login') })] }), _jsx("div", { style: hintStyle, children: t('auth.hint') }), _jsx(BoolField, { id: "git-sync-enabled", label: t('field.enabled'), value: state.enabled, onEdit: value => { props.edit('enabled', value); } }), _jsx(TextField, { id: "git-sync-remote", label: t('field.remoteUrl'), hint: t('field.remoteUrlHint'), value: state.remoteUrl, onEdit: value => { props.edit('remoteUrl', value); } }), _jsx(TextField, { id: "git-sync-branch", label: t('field.branch'), value: state.branch, onEdit: value => { props.edit('branch', value); } }), _jsx(NumberField, { id: "git-sync-interval", label: t('field.intervalMinutes'), value: state.intervalMinutes, onEdit: value => { props.edit('intervalMinutes', value); } }), _jsx(BoolField, { id: "git-sync-autocreate", label: t('field.autoCreateRepo'), value: state.autoCreateRepo, onEdit: value => { props.edit('autoCreateRepo', value); } }), state.failed ? _jsx("p", { style: noteStyle, children: t('state.saveFailed') }) : null, _jsxs("div", { style: footerStyle, children: [_jsx("button", { type: "button", style: buttonStyle, disabled: disabled || !state.dirty || state.saving, onClick: props.discard, children: t('action.discard') }), _jsx("button", { type: "button", style: saveButtonStyle, disabled: disabled || !state.dirty || state.saving, onClick: props.save, children: t(state.saving ? 'action.saving' : 'action.save') })] })] }))
                : null] }));
}
//# sourceMappingURL=GitSyncCard.js.map