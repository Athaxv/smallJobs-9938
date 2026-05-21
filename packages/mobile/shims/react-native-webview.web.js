/**
 * Web shim for react-native-webview.
 * On web, render an <iframe> instead of the native WebView.
 * This lets the Explore screen work in the Runable mobile preview (web).
 */
import React from 'react';

const WebView = React.forwardRef(function WebView(props, ref) {
  const { source, style, onMessage, scrollEnabled, ...rest } = props;

  // Build the iframe src
  const src = source?.uri ?? null;
  const html = source?.html ?? null;

  // For HTML content, use a blob URL or srcdoc
  const iframeProps = html
    ? { srcDoc: html }
    : src
    ? { src }
    : {};

  // Forward postMessage from iframe to onMessage handler
  React.useEffect(() => {
    if (!onMessage) return;
    function handler(event) {
      try {
        // Simulate the nativeEvent shape
        onMessage({ nativeEvent: { data: event.data } });
      } catch {}
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  // Expose injectJavaScript via ref
  React.useImperativeHandle(ref, () => ({
    injectJavaScript: (code) => {
      // Find the iframe and eval inside it
      const iframe = document.querySelector('[data-rnwebview]');
      if (iframe && iframe.contentWindow) {
        try { iframe.contentWindow.eval(code); } catch {}
      }
    },
    postMessage: (data) => {
      const iframe = document.querySelector('[data-rnwebview]');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(data, '*');
      }
    },
  }));

  const styleObj = Array.isArray(style) ? Object.assign({}, ...style) : style || {};

  return React.createElement('iframe', {
    ...iframeProps,
    'data-rnwebview': true,
    ref: null,
    style: {
      border: 'none',
      width: styleObj.width ?? '100%',
      height: styleObj.height ?? '100%',
      flex: styleObj.flex,
      position: styleObj.position,
      top: styleObj.top,
      left: styleObj.left,
      right: styleObj.right,
      bottom: styleObj.bottom,
    },
    allow: 'geolocation',
    sandbox: 'allow-scripts allow-same-origin allow-popups',
  });
});

export default WebView;
export { WebView };
