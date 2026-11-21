"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type LaunchSplashProps = {
  subtitle?: string;
  durationMs?: number;
};

const SPLASH_KEY = "redbox_splash_seen";

export default function LaunchSplash({
  subtitle = "Memuat Ruang Operasional",
  durationMs = 660,
}: LaunchSplashProps) {
  const [visible, setVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SPLASH_KEY) === "1") {
        return;
      }
      window.sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {}

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="launch-splash"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
          }}
          aria-hidden="true"
        >
          <div className="launch-backdrop" />
          <motion.div
            className="launch-core"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.03, y: -6 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="launch-emblem-wrap">
              <motion.div
                className="launch-ring"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.18, opacity: [0, 0.65, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
              />
              {imgError ? (
                <div className="launch-logo-fallback">RB</div>
              ) : (
                <img
                  src="/redbox-logo.png"
                  alt="REDBOX"
                  className="launch-logo"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              )}
            </div>

            <div className="launch-title">
              <strong>REDBOX</strong>
              <span>Live Attendance</span>
            </div>

            <div className="launch-bar-track">
              <motion.div
                className="launch-bar-fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: durationMs / 1000,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </div>

            <p className="launch-sub">{subtitle}</p>
          </motion.div>

          <div className="launch-footer">
            <span>© {new Date().getFullYear()} Nauell Tech</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
