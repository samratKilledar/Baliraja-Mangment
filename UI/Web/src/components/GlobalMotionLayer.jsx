import { useEffect, useState } from 'react';
import { animate, useValue, withTiming } from 'react-ui-animate';

export default function GlobalMotionLayer() {
  const [flip, setFlip] = useState(false);
  const [wave, setWave] = useValue(0);

  useEffect(() => {
    const timer = setInterval(() => setFlip((prev) => !prev), 2600);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setWave(withTiming(flip ? 1 : 0));
  }, [flip, setWave]);

  return (
    <div className="global-motion-layer" aria-hidden="true">
      <animate.div
        className="global-glow global-glow-a"
        style={{
          translateY: wave.to([0, 1], [-12, 10]),
          opacity: wave.to([0, 1], [0.28, 0.58])
        }}
      />
      <animate.div
        className="global-glow global-glow-b"
        style={{
          translateY: wave.to([0, 1], [8, -10]),
          opacity: wave.to([0, 1], [0.22, 0.42])
        }}
      />
    </div>
  );
}
