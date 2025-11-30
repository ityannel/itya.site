import { useEffect, useRef, useState } from 'react';

const FadeIn = ({ children, style }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        // 画面に入ったら（交差したら）
        if (entry.isIntersecting) {
          setIsVisible(true);
          // 一度表示されたら監視をやめる
          observer.unobserve(entry.target);
        }
      });
    }, { 
      threshold: 0.2 // 20%くらい見えたら発動
    });

    const currentElement = domRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`fade-target ${isVisible ? 'visible' : ''}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default FadeIn;