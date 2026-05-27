import { Howl, Howler } from "howler";

// Define sound configurations
const soundConfigs = {
  connect: { src: ["/sounds/water-drip.mp3"], volume: 0.5 },
  disconnect: { src: ["/sounds/disconnect.mp3"], volume: 0.3 },
  calling: { src: ["/sounds/calling.mp3"], volume: 0.8 },
  // reconnect: { src: ["/sounds/reconnect.mp3"], volume: 0.3 },
  // userJoin: { src: ["/sounds/user-join.mp3"], volume: 0.2 },
  // userLeave: { src: ["/sounds/user-leave.mp3"], volume: 0.2 },
  newMessage: { src: ["/sounds/new-message.mp3"], volume: 0.4 },
  // sendMessage: { src: ["/sounds/send-message.mp3"], volume: 0.2 }, // More subtle sound for sending
  // kicked: { src: ["/sounds/kicked.mp3"], volume: 0.5 },
  // error: { src: ["/sounds/error.mp3"], volume: 0.5 },
  // Add other game sounds (e.g., turn start, correct answer, incorrect answer)
  // gameStart: { src: ['/sounds/game-start.mp3'], volume: 0.5 },
  // correctAnswer: { src: ["/sounds/correct.mp3"], volume: 0.5 },
  // wrongAnswer: { src: ["/sounds/wrong-answer.mp3"], volume: 0.5 },
  // gameStart: { src: ["/sounds/water-drip.mp3"], volume: 0.5 },
  // buzzer_hit_success_own_team: {
  //   src: ["/sounds/buzzer.mp3"],
  //   volume: 0.5,
  // },

  // Locomotive sounds - Ensure these files exist in public/sounds/
  trainHorn: { src: ["/sounds/train-horn.mp3"], volume: 0.7 },
  brickHit: { src: ["/sounds/brick-hit.mp3"], volume: 0.45 },
  trainBrakes: {
    src: ["/sounds/train-brakes.mp3"],
    volume: 0.4,
    loop: false,
  },
  trainWheels: {
    src: ["/sounds/train-wheels.mp3"],
    volume: 0.0,
    loop: true,
  },
  trainEngine: {
    src: ["/sounds/train-engine.mp3"],
    volume: 0.3,
    loop: true,
  },
};

// Lazy-loaded sound instances
const sounds: Record<string, Howl> = {};

/**
 * Gets or creates a Howl instance for a given sound name.
 */
function getSoundInstance(name: keyof typeof soundConfigs): Howl | null {
  if (!import.meta.client) return null;

  if (!sounds[name] && soundConfigs[name]) {
    sounds[name] = new Howl(soundConfigs[name]);
  }
  return sounds[name] || null;
}

/**
 * Automatically attempts to resume the AudioContext on the first user gesture.
 * This satisfies browser auto-play policies.
 */
if (import.meta.client) {
  const resumeAudio = () => {
    if (Howler.ctx && Howler.ctx.state === "suspended") {
      Howler.ctx.resume().catch((err) => {
        console.warn("Failed to resume AudioContext:", err);
      });
    }
    // Remove listeners once the context is running or we've tried to resume
    if (Howler.ctx && Howler.ctx.state === "running") {
      window.removeEventListener("click", resumeAudio);
      window.removeEventListener("touchstart", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
    }
  };

  window.addEventListener("click", resumeAudio);
  window.addEventListener("touchstart", resumeAudio);
  window.addEventListener("keydown", resumeAudio);
}

export function useSound() {
  const playSound = (name: keyof typeof soundConfigs) => {
    const sound = getSoundInstance(name);
    if (sound) {
      // If the context is still suspended, Howler will handle it (usually by not playing),
      // but we try to resume just in case this call itself is part of a gesture.
      if (Howler.ctx && Howler.ctx.state === "suspended") {
        Howler.ctx.resume().catch(() => {});
      }
      sound.play();
    } else {
      console.warn(`Sound "${name}" not found.`);
    }
  };

  /**
   * Plays a sound with slight pitch and volume randomization.
   * Useful for avoiding "machine-gun" effect on repetitive sounds like brick hits.
   */
  const playWithVariation = (
    name: keyof typeof soundConfigs,
    rateRange = 0.2,
    volRange = 0.1,
  ) => {
    const sound = getSoundInstance(name);
    if (sound) {
      if (Howler.ctx && Howler.ctx.state === "suspended") {
        Howler.ctx.resume().catch(() => {});
      }
      const id = sound.play();
      // Randomize rate (pitch) around 1.0
      sound.rate(1.0 + (Math.random() - 0.5) * rateRange, id);
      // Randomize volume slightly
      sound.volume(sound.volume() + (Math.random() - 0.5) * volRange, id);
    }
  };

  /**
   * Returns the Howl instance directly for advanced control (e.g. updating volume/rate in a loop)
   */
  const getSound = (name: keyof typeof soundConfigs) => getSoundInstance(name);

  const useContinuous = (
    name: keyof typeof soundConfigs,
    rateRange = 0.05,
    volRange = 0.05,
  ) => {
    const sound = getSoundInstance(name);
    let soundId: number | null = null;
    let isHeld = false;
    const baseVolume = sound ? (sound.volume() as number) : 0;

    const start = () => {
      if (isHeld || !sound) return;
      isHeld = true;

      if (Howler.ctx && Howler.ctx.state === "suspended") {
        Howler.ctx.resume().catch(() => {});
      }

      if (soundId !== null) {
        sound.off("fade", undefined, soundId);
        sound.stop(soundId);
        soundId = null;
      }

      const id = sound.play();
      soundId = id;
      sound.loop(true, id); // Ensure the sound loops while held

      // Apply variation logic for organic feel
      sound.rate(1.0 + (Math.random() - 0.5) * rateRange, id);

      // Smooth start to prevent "clicks" and "cuts" at loop boundary
      const targetVol = baseVolume + (Math.random() - 0.5) * volRange;
      sound.volume(0, id);
      sound.fade(0, targetVol, 100, id);
    };

    const stop = () => {
      if (!isHeld || !sound || soundId === null) return;
      isHeld = false;

      const id = soundId;
      const currentVol = sound.volume(id) as number;

      if (currentVol <= 0) {
        sound.off("fade", undefined, id);
        sound.stop(id);
        if (soundId === id) soundId = null;
        return;
      }

      sound.fade(currentVol, 0, 300, id);

      sound.once(
        "fade",
        () => {
          // Break the recursion by ensuring this only runs if it's still the active sound
          // and by clearing the listener before stopping.
          if (!isHeld && soundId === id) {
            sound.off("fade", undefined, id);
            sound.stop(id);
            soundId = null;
          }
        },
        id,
      );
    };

    return { start, stop };
  };

  /**
   * Stops all sounds currently playing.
   */
  const stopAll = () => {
    Howler.stop();
  };

  /**
   * Mutes or unmutes all sounds.
   */
  const muteAll = (muted: boolean) => {
    Howler.mute(muted);
  };

  return {
    playSound,
    playWithVariation,
    useContinuous,
    getSound,
    stopAll,
    muteAll,
  };
}