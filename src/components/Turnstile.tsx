'use client';

import { useEffect, useRef } from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export default function Turnstile({ onVerify }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      // In dev without key, auto-verify
      onVerify('dev-token');
      return;
    }

    const renderWidget = () => {
      if (containerRef.current && window.turnstile && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          theme: 'dark',
        });
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      window.onTurnstileLoad = renderWidget;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, [onVerify]);

  return <div ref={containerRef} className="my-4" />;
}
