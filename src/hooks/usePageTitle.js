import { useEffect } from "react";

export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · KainWise` : "KainWise";
    return () => {
      document.title = prev;
    };
  }, [title]);
}
