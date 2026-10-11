import { useEffect, useState } from 'react';

type NetworkState =
  | 'ONLINE'
  | 'OFFLINE'
  | 'RESTORED';

export default function NetworkStatusBanner() {
  const [networkState, setNetworkState] =
    useState<NetworkState>(() =>
      navigator.onLine
        ? 'ONLINE'
        : 'OFFLINE'
    );

  useEffect(() => {
    let restoredTimer:
      | number
      | undefined;

    const handleOffline = () => {
      if (restoredTimer) {
        window.clearTimeout(
          restoredTimer
        );
      }

      setNetworkState('OFFLINE');
    };

    const handleOnline = () => {
      setNetworkState(
        (current) =>
          current === 'OFFLINE'
            ? 'RESTORED'
            : 'ONLINE'
      );

      if (restoredTimer) {
        window.clearTimeout(
          restoredTimer
        );
      }

      restoredTimer =
        window.setTimeout(() => {
          setNetworkState('ONLINE');
        }, 2500);
    };

    window.addEventListener(
      'offline',
      handleOffline
    );

    window.addEventListener(
      'online',
      handleOnline
    );

    return () => {
      window.removeEventListener(
        'offline',
        handleOffline
      );

      window.removeEventListener(
        'online',
        handleOnline
      );

      if (restoredTimer) {
        window.clearTimeout(
          restoredTimer
        );
      }
    };
  }, []);

  if (networkState === 'ONLINE') {
    return null;
  }

  const restored =
    networkState === 'RESTORED';

  return (
    <div
      className={
        'networkStatusBanner ' +
        (restored
          ? 'networkStatusBannerRestored'
          : 'networkStatusBannerOffline')
      }
      role="status"
      aria-live="polite"
    >
      {restored ? (
        <span
          className="networkStatusDot"
          aria-hidden="true"
        />
      ) : (
        <span
          className="networkStatusSpinner"
          aria-hidden="true"
        />
      )}

      <div>
        <strong>
          {restored
            ? 'Сеть восстановлена'
            : 'Нет подключения к сети'}
        </strong>

        {!restored && (
          <span>
            Ждём восстановления соединения…
          </span>
        )}
      </div>
    </div>
  );
}
