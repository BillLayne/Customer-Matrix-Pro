import React from 'react';

interface State { error: Error | null }

// Last line of defence: a render crash (most likely a malformed value saved in
// this browser) shows a way out instead of a blank page.
export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error) { console.error('Dashboard render failed', error); }
  private resetSettings = () => {
    try {
      Object.keys(window.localStorage).filter(key => /^(matrix-pro-|quicklink-|quick-image-|theme$)/.test(key)).forEach(key => window.localStorage.removeItem(key));
    } catch { /* storage unavailable: a reload is all we can do */ }
    window.location.reload();
  };
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', background: '#f3f4f5', color: '#202327' }}>
        <div style={{ width: 'min(480px, 100%)', background: 'white', border: '1px solid #dadde1', borderRadius: 12, padding: 28 }}>
          <p style={{ margin: 0, color: '#003f87', fontWeight: 700 }}>Bill Layne Insurance</p>
          <h1 style={{ fontSize: 22, margin: '8px 0 12px' }}>The dashboard hit a problem</h1>
          <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.5, color: '#5d626b' }}>Reload to try again. If it keeps happening, reset the settings saved in this browser: pinned tools, recent searches and the theme go back to their defaults. Nothing on the server is affected.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: '0 18px', borderRadius: 8, border: 0, background: '#003f87', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Reload</button>
            <button type="button" onClick={this.resetSettings} style={{ minHeight: 44, padding: '0 18px', borderRadius: 8, border: '1px solid #dadde1', background: 'white', color: '#202327', fontWeight: 600, cursor: 'pointer' }}>Reset saved settings and reload</button>
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 12, color: '#5d626b', overflowWrap: 'anywhere' }}>{this.state.error.message}</p>
        </div>
      </main>
    );
  }
}
