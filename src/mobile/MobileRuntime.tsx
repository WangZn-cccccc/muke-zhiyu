import { useEffect, type PropsWithChildren } from "react";
import { MobileDeviceProvider, useMobileDevice } from "./Device";
import { KeyboardDock, KeyboardProvider, useKeyboard } from "./Keyboard";
import { PhoneFrame } from "./PhoneFrame";
import { HomeIndicator, StatusBar } from "./components";

export function MobileRuntime({ children }: PropsWithChildren) {
  const previewMode = import.meta.env.DEV && typeof window !== "undefined" && (
    new URLSearchParams(window.location.search).get("devicePreview") === "1" ||
    window.location.pathname.endsWith("/tests/runtime-fixture.html")
  );

  return (
    <MobileDeviceProvider>
      {previewMode ? (
        <PhoneFrame>
          <KeyboardProvider>
            <KeyboardPreview />
            <StatusBar />
            <MobileAppViewport>{children}</MobileAppViewport>
            <HomeIndicator />
            <KeyboardDock />
          </KeyboardProvider>
        </PhoneFrame>
      ) : (
        <div className="responsive-runtime" data-testid="responsive-runtime">
          <div className="responsive-app-frame">
            <KeyboardProvider simulated={false}>
              <MobileAppViewport>{children}</MobileAppViewport>
            </KeyboardProvider>
          </div>
        </div>
      )}
    </MobileDeviceProvider>
  );
}

function MobileAppViewport({ children }: PropsWithChildren) {
  const { device } = useMobileDevice();
  const keyboard = useKeyboard();

  return (
    <div
      className="mobile-app-viewport"
      data-keyboard-visible={keyboard.visible ? "true" : "false"}
      data-platform={device.platform}
      data-testid="mobile-app-viewport"
    >
      {children}
    </div>
  );
}

function KeyboardPreview() {
  const keyboard = useKeyboard();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("keyboard") === "1") {
      keyboard.show();
    }
  }, [keyboard]);

  return null;
}
