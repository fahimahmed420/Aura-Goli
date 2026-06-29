import { useState, useEffect } from "react";

export function usePageReady(dependencies: boolean[]): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (dependencies.every((dep) => dep === true)) {
      setIsReady(true);
    }
  }, [dependencies]);

  return isReady;
}
