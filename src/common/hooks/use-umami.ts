"use client";

import { useCallback, useEffect, useState } from "react";

interface PageView {
  // Hostname of server
  hostname: string;
  // Browser language
  language: string;
  // Page referrer
  referrer: string;
  // Screen dimensions (eg. 1920x1080)
  screen: string;
  // Page title
  title: string;
  // Page url
  url: string;
  // Website ID (required)
  website: string;
}

type EventName = string;
type EventData = Record<string, string | number>;
type SessionData = Record<string, unknown>;

interface Umami {
  pageView(data?: Partial<PageView>): void;
  event(name: EventName, data?: EventData): void;
  identify(session_data: SessionData): void;
}

interface _Umami {
  track(data?: Partial<PageView>): void;
  track(callback: (props: PageView) => PageView): void;
  track(name: EventName, data?: EventData): void;
  identify(session_data: SessionData): void;
}

// https://umami.is/docs/tracker-functions
export default function useUmami(): Umami {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // this will be set to true only in the client
  }, []);

  const isUmamiAvailable = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
    return isClient && typeof (window as any).umami !== "undefined";
  }, [isClient]);

  const windowUmami = useCallback(() => {
    if (!isUmamiAvailable()) {
      console.warn("UmamiProvider not found");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
    return (window as any).umami as _Umami;
  }, [isUmamiAvailable]);

  const pageView = useCallback(
    (data?: Partial<PageView>) => {
      const umamiInstance = windowUmami();

      umamiInstance?.track((props: PageView) => ({
        ...props,
        ...(data && { ...data }),
      }));
    },
    [windowUmami],
  );

  const event = useCallback(
    (name: EventName, data?: EventData) => {
      const umamiInstance = windowUmami();

      umamiInstance?.track(name, { ...(data && { ...data }) });
      return { name, data: { ...(data && { ...data }) } };
    },
    [windowUmami],
  );

  /**
  Example
  ```tsx
  function handleRunIdentify() {
    window['umami'].identify({
      userId: 123,
      name: 'brian',
      number: Math.random() * 100,
      test: 'test-data',
      boolean: true,
      booleanError: 'true',
      time: new Date(),
      time2: new Date().toISOString(),
      nested: {
        test: 'test-data',
        number: 1,
        object: {
          test: 'test-data',
        },
      },
      array: [1, 2, 3],
    });
  }
  ```
  */
  const identify = useCallback(
    (session_data: SessionData) => {
      const umamiInstance = windowUmami();

      umamiInstance?.identify({
        ...(session_data && { ...session_data }),
      });
      return { session_data: { ...(session_data && { ...session_data }) } };
    },
    [windowUmami],
  );

  return { pageView, event, identify };
}
