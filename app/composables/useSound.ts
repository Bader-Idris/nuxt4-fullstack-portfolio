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
};

export function useSound() {
  const playSound = (name: keyof typeof sounds) => {
    if (sounds[name]) {
      sounds[name].play();
    } else {
      console.warn(`Sound "${name}" not found.`);
    }
  };

  // You might add methods to control volume, mute, etc. here

  return {
    playSound,
  };
}
