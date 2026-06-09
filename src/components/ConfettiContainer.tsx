import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import styles from './HomeClient.module.css';

export type ConfettiHandle = {
  launch: () => void;
};

const ConfettiContainer = forwardRef<ConfettiHandle>((_props, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const confettiRef = useRef<Array<any>>([]);

  useImperativeHandle(ref, () => ({
    launch: () => {
      const colors = ['#FF8FB1', '#FFD66B', '#7DE2C9', '#8EC7FF', '#FFD1F0', '#FFC9A8', '#E3C6FF', '#BEE7A8'];
      const ww = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const wh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const maxDx = Math.max(240, Math.floor(ww * 0.45));
      const piecesCount = 400;
      const baseId = Date.now();

      const container = containerRef.current;
      if (!container) return;

      const now = performance.now();
      const items: any[] = [];

      for (let i = 0; i < piecesCount; i++) {
        const left = Math.random() * ww;
        const top = -100 + Math.random() * 50; // -100 .. -50
        const color = colors[Math.floor(Math.random() * colors.length)];
        const rot = Math.random() * 360;
        const size = Math.floor(Math.random() * 10) + 6; // 6-15px
        const radius = Math.floor(Math.random() * 6);
        const dx = (Math.random() * (maxDx * 2) - maxDx); // horizontal drift total
        // faster: 2000ms - 4500ms
        const duration = (Math.random() * 2.5 + 2) * 1000; // ms
        const delay = Math.random() * 300; // up to 300ms

        const el = document.createElement('span');
        el.className = styles.confettiPiece;
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.backgroundColor = color;
        el.style.width = `${size}px`;
        el.style.height = `${Math.round(size * 1.25)}px`;
        el.style.borderRadius = `${radius}px`;
        el.style.opacity = '1';
        el.style.animation = 'none';
        container.appendChild(el);

        const start = now + delay;
        const vx = dx / duration; // px per ms
        const vy = (wh + Math.abs(top) + 200) / duration; // px per ms
        const vrot = (Math.random() * 600 + 200) / duration; // deg per ms

        const item = {
          id: baseId + i,
          el,
          left,
          top,
          vx,
          vy,
          rot,
          vrot,
          start,
          duration,
          _lastTime: null as number | null,
          alive: true,
          move(nowTime: number) {
            if (nowTime < this.start) return true;
            const elapsed = nowTime - this.start;
            const dt = nowTime - (this._lastTime ?? this.start);
            this.left += this.vx * dt;
            this.top += this.vy * dt;
            this.rot += this.vrot * dt;
            this._lastTime = nowTime;
            const t = Math.min(elapsed / this.duration, 1);
            this.el.style.transform = `translate(${this.left}px, ${this.top}px) rotate(${this.rot}deg)`;
            this.el.style.opacity = `${1 - t}`;
            if (elapsed >= this.duration) {
              this.alive = false;
              return false;
            }
            return true;
          }
        };

        items.push(item);
      }

      confettiRef.current = items;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const tick = (time: number) => {
        const list = confettiRef.current;
        for (let i = list.length - 1; i >= 0; i--) {
          const it = list[i];
          const alive = it.move(time);
          if (!alive) {
            try { it.el.remove(); } catch (e) {}
            list.splice(i, 1);
          }
        }
        if (list.length > 0) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }));

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const list = confettiRef.current || [];
      for (let i = 0; i < list.length; i++) {
        try { list[i].el.remove(); } catch (e) {}
      }
      confettiRef.current = [];
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className={styles.confettiContainer} aria-hidden />;
});

export default ConfettiContainer;
