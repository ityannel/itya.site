import { useEffect, useRef } from 'react';
import * as skinview3d from 'skinview3d';

const SkinViewer = () => {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    autoRotate: true,
    targetRotation: 0,
    scrollTimeout: null,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const skins = [
      "/img/itya-skin.png",
      "/img/itya-sunglass.png",
      "/img/itya-colorful.png",
      "/img/itya-skin-hanten.png"
    ];

    const animations = [
      new skinview3d.WalkingAnimation(),
      new skinview3d.RunningAnimation(),
      new skinview3d.IdleAnimation(),
    ];

    const choosedSkin = skins[Math.floor(Math.random() * skins.length)];
    const choosedAnimation = animations[Math.floor(Math.random() * animations.length)];

    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: 600,
      height: 600,
      skin: choosedSkin
    });

    viewer.animation = choosedAnimation;
    viewer.controls.enableZoom = false;
    viewer.autoRotate = false; // 手動制御のためOFF

    // アニメーションループ
    let animationId;
    const animate = () => {
      const state = stateRef.current;
      if (state.autoRotate) {
        state.targetRotation += 0.01;
      }
      if (viewer.playerObject) {
         viewer.playerObject.rotation.y += (state.targetRotation - viewer.playerObject.rotation.y) * 0.1;
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();

    // スクロール制御
    const handleScroll = () => {
      const state = stateRef.current;
      state.autoRotate = false;
      state.targetRotation = window.scrollY * 0.005; 
      if (state.scrollTimeout) clearTimeout(state.scrollTimeout);
      state.scrollTimeout = setTimeout(() => {
        state.autoRotate = true;
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      viewer.dispose();
      cancelAnimationFrame(animationId);
      window.removeEventListener('scroll', handleScroll);
      if (stateRef.current.scrollTimeout) clearTimeout(stateRef.current.scrollTimeout);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
    />
  );
};

export default SkinViewer;