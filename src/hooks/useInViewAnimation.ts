import { useRef, useEffect, useState } from "react";

interface UseInViewAnimationOptions extends IntersectionObserverInit {
  once?: boolean;
}

export function useInViewAnimation(options?: UseInViewAnimationOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const { once = true, threshold = 0.1, rootMargin = "-50px", ...rest } = options || {};

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) {
            observer.unobserve(entry.target);
          }
        }
      },
      {
        threshold,
        rootMargin,
        ...rest,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [once, threshold, rootMargin, rest]);

  return { ref, isInView };
}
