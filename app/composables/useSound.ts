import { Howl } from "howler";

// Define sound files - place these in your public directory (e.g., public/sounds)
const sounds = {
  connect: new Howl({ src: ["/sounds/water-drip.mp3"], volume: 0.5 }),
  // disconnect: new Howl({ src: ["/sounds/Disconnect.mp3"], volume: 0.3 }),
  // reconnect: new Howl({ src: ["/sounds/reconnect.mp3"], volume: 0.3 }),
  // userJoin: new Howl({ src: ["/sounds/user-join.mp3"], volume: 0.2 }),
  // userLeave: new Howl({ src: ["/sounds/user-leave.mp3"], volume: 0.2 }),
  newMessage: new Howl({ src: ["/sounds/new-message.mp3"], volume: 0.4 }),
  // sendMessage: new Howl({ src: ["/sounds/send-message.mp3"], volume: 0.2 }), // More subtle sound for sending
  // kicked: new Howl({ src: ["/sounds/kicked.mp3"], volume: 0.5 }),
  // error: new Howl({ src: ["/sounds/error.mp3"], volume: 0.5 }),
  // Add other game sounds (e.g., turn start, correct answer, incorrect answer)
  // gameStart: new Howl({ src: ['/sounds/game-start.mp3'], volume: 0.5 }),
  // correctAnswer: new Howl({ src: ["/sounds/correct.mp3"], volume: 0.5 }),
  // wrongAnswer: new Howl({ src: ["/sounds/wrong-answer.mp3"], volume: 0.5 }),
  // gameStart: new Howl({ src: ["/sounds/water-drip.mp3"], volume: 0.5 }),
  // buzzer_hit_success_own_team: new Howl({
  //   src: ["/sounds/buzzer.mp3"],
  //   volume: 0.5,
  // }),

  // Locomotive sounds - Ensure these files exist in public/sounds/
  trainHorn: new Howl({
    src: ["/sounds/train-horn.wav"],
    volume: 0.7,
    // rate: 0.9,
  }),
  brickHit: new Howl({ src: ["/sounds/brick-hit.wav"], volume: 0.45 }),
  trainBrakes: new Howl({
    src: ["/sounds/train-brakes.wav"],
    volume: 0.4,
    loop: false,
  }),
  trainWheels: new Howl({
    src: ["/sounds/train-wheels.wav"],
    volume: 0.0,
    loop: true,
  }),
  trainEngine: new Howl({
    src: ["/sounds/train-engine.wav"],
    volume: 0.3,
    loop: true,
  }),
};

export function useSound() {
  const playSound = (name: keyof typeof sounds) => {
    if (sounds[name]) {
      sounds[name].play();
    } else {
      console.warn(`Sound "${name}" not found.`);
    }
  };

  /**
   * Plays a sound with slight pitch and volume randomization.
   * Useful for avoiding "machine-gun" effect on repetitive sounds like brick hits.
   */
  const playWithVariation = (
    name: keyof typeof sounds,
    rateRange = 0.2,
    volRange = 0.1
  ) => {
    const sound = sounds[name];
    if (sound) {
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
  const getSound = (name: keyof typeof sounds) => sounds[name];

  const useContinuous = (
    name: keyof typeof sounds,
    rateRange = 0.05,
    volRange = 0.05
  ) => {
    const sound = sounds[name];
    let soundId: number | null = null;
    let isHeld = false;
    const baseVolume = sound.volume() as number;

    const start = () => {
      if (isHeld || !sound) return;
      isHeld = true;

      if (soundId !== null) sound.stop(soundId);
      sound.loop(true); // Ensure the sound loops while held

      const id = sound.play();
      soundId = id;

      // Apply variation logic for organic feel
      sound.rate(1.0 + (Math.random() - 0.5) * rateRange, id);

      // Smooth start to prevent "clicks" and "cuts" at loop boundary
      const targetVol = baseVolume + (Math.random() - 0.5) * volRange;
      sound.volume(0, id);
      sound.fade(0, targetVol, 100, id);
    };

    const stop = () => {
      if (!isHeld || soundId === null) return;
      isHeld = false;

      const id = soundId;
      const currentVol = sound.volume(id) as number;
      sound.fade(currentVol, 0, 300, id); // Howler handles the smooth fade natively

      sound.once(
        "fade",
        () => {
          sound.stop(id);
          sound.loop(false); // Reset loop for future use
          soundId = null;
          sound.volume(baseVolume); // reset for next play
        },
        id
      );
    };

    return { start, stop };
  };

  return {
    playSound,
    playWithVariation,
    useContinuous,
    getSound,
  };
}
