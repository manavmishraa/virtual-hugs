"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HUG_CONFIG, DEFAULT_PREFERENCES, type HugType, type UserPreferences } from "@/lib/types";

interface HugExperienceProps {
  hugType: HugType;
  senderName: string;
  onComplete: () => void;
  preferences?: UserPreferences;
}

export default function HugExperience({
  hugType,
  senderName,
  onComplete,
  preferences = DEFAULT_PREFERENCES,
}: HugExperienceProps) {
  const config = HUG_CONFIG[hugType];
  const [phase, setPhase] = useState<"entering" | "active" | "exiting">("entering");
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const duration = config.duration * preferences.hug_duration_multiplier;
  const beatInterval = 60000 / config.bpm;

  // Haptic pulse (respects user preference)
  const pulseHaptic = useCallback(() => {
    if (preferences.haptics_enabled && "vibrate" in navigator) {
      navigator.vibrate([60, 40, 60]);
    }
  }, [preferences.haptics_enabled]);

  // Audio synthesis (respects user preference)
  const startAudio = useCallback(() => {
    if (!preferences.sound_enabled) return undefined;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    // Warm ambient pad — single tone softened with a low-pass filter
    const padFreq = hugType === "warm" ? 160 : hugType === "tight" ? 130 : 200;
    const padOsc = ctx.createOscillator();
    const padFilter = ctx.createBiquadFilter();
    const padGain = ctx.createGain();
    padOsc.type = "triangle"; // softer than sine, warmer than square
    padOsc.frequency.value = padFreq;
    padFilter.type = "lowpass";
    padFilter.frequency.value = 400; // cut highs for warmth
    padFilter.Q.value = 1;
    padGain.gain.value = 0;
    padGain.gain.linearRampToValueAtTime(0.20, ctx.currentTime + 3); // gentle fade-in
    padOsc.connect(padFilter).connect(padGain).connect(ctx.destination);
    padOsc.start();

    // Subtle heartbeat — single gentle thump
    function beat() {
      if (!audioContextRef.current) return;
      const c = audioContextRef.current;
      const osc = c.createOscillator();
      const filter = c.createBiquadFilter();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = 55; // low, warm thump — same for all types
      filter.type = "lowpass";
      filter.frequency.value = 150; // keep it round and soft
      gain.gain.setValueAtTime(0.30, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
      osc.connect(filter).connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.4);
      pulseHaptic();
    }

    const heartbeatId = setInterval(beat, beatInterval);
    beat();

    return () => {
      clearInterval(heartbeatId);
      padGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      setTimeout(() => {
        padOsc.stop();
        ctx.close();
      }, 1800);
    };
  }, [hugType, beatInterval, pulseHaptic, preferences.sound_enabled]);

  // Particle canvas animation
  const startParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      life: number;
    }> = [];

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Create particles
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        size: Math.random() * 4 + 2,
        alpha: Math.random() * 0.6 + 0.2,
        life: Math.random(),
      });
    }

    function animate() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 0.002;

        if (p.y < -10 || p.life > 1) {
          p.y = h + 10;
          p.x = Math.random() * w;
          p.life = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${config.glow}`;
        ctx.globalAlpha = p.alpha * (1 - p.life * 0.5);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    }

    animate();
  }, [config.glow]);

  // Main lifecycle
  useEffect(() => {
    // Enter phase
    const enterTimer = setTimeout(() => {
      setPhase("active");
      startTimeRef.current = Date.now();

      const stopAudio = startAudio();
      startParticles();

      // Progress tracking
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const p = Math.min(elapsed / duration, 1);
        setProgress(p);

        if (p >= 1) {
          clearInterval(progressInterval);
          setPhase("exiting");
          stopAudio?.();
          cancelAnimationFrame(animFrameRef.current);

          // Exit chime (respects sound preference)
          if (preferences.sound_enabled) {
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = "sine";
              osc.frequency.value = 523.25; // C5
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
              osc.connect(gain).connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 1.5);
              setTimeout(() => ctx.close(), 2000);
            } catch {
              // audio not available
            }
          }

          setTimeout(onComplete, 2000);
        }
      }, 100);

      return () => clearInterval(progressInterval);
    }, 800);

    return () => {
      clearTimeout(enterTimer);
      cancelAnimationFrame(animFrameRef.current);
      audioContextRef.current?.close();
    };
  }, [duration, startAudio, startParticles, onComplete]);

  // Tap to dismiss
  function handleDismiss() {
    cancelAnimationFrame(animFrameRef.current);
    audioContextRef.current?.close();
    audioContextRef.current = null;
    onComplete();
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
        onClick={handleDismiss}
      >
        {/* Particle canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Radial pulse */}
        {phase === "active" && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              background: `radial-gradient(circle, ${config.glow}88 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.6, 0.3, 0.6],
            }}
            transition={{
              duration: 60 / config.bpm,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Sender name */}
        <motion.p
          className="absolute top-16 text-white/70 text-sm font-medium tracking-wider"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          From {senderName}
        </motion.p>

        {/* Progress indicator (subtle) */}
        {phase === "active" && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-32">
            <div className="h-0.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white/50 rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Exiting message */}
        {phase === "exiting" && (
          <motion.p
            className="text-white/80 text-lg font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Hug received
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
