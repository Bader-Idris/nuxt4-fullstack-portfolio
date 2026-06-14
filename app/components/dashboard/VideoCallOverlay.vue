<template>
  <Transition name="slide-up">
    <div v-show="isInCall" class="video-call-overlay" :class="{ 'is-fullscreen': isFullscreen }">
      <div class="call-wrapper">
        <header class="call-header" data-clarity-mask="true">
          <div class="call-partner-info">
            <Icon name="mdi:phone" class="call-icon" />
            <span>{{ $t('dashboard.in_call_with') }}: {{ partnerName }}</span>
          </div>
          <button class="minimize-btn" @click="$emit('toggle-minimize')">
            <Icon :name="isCallMinimized ? 'mdi:open-in-new' : 'mdi:close-network-outline'" />
          </button>
        </header>

        <div v-show="!isCallMinimized" class="video-grid" :class="{ 'audio-only-grid': callType === 'audio', 'videos-swapped': isVideosSwapped }">
          <template v-if="callType === 'video'">
            <div class="remote-video-container">
              <video
                ref="remoteVideoRef"
                autoplay
                playsinline
                class="remote-video"
              />
              <div v-if="!remoteStream" class="connecting-overlay">
                <span>{{ $t('dashboard.call_connecting') }}</span>
                <div class="spinner" />
              </div>
            </div>
            <div class="local-video-container">
              <video
                ref="localVideoRef"
                autoplay
                playsinline
                muted
                class="local-video"
              />
              <!-- Resize Handle for PiP -->
              <div class="resize-handle">
                <Icon name="mdi:drag" />
              </div>
            </div>
          </template>
          <template v-else>
            <!-- Premium Audio Calling Layout -->
            <div class="audio-call-container" data-clarity-mask="true">
              <audio ref="remoteAudioRef" autoplay playsinline style="display: none;"></audio>
              <div class="audio-avatar-wrapper">
                <div class="avatar-large-glow">
                  {{ partnerName?.charAt(0) || '?' }}
                </div>
                <div class="pulse-ring ring-1"></div>
                <div class="pulse-ring ring-2"></div>
                <div class="pulse-ring ring-3"></div>
              </div>
              <div class="audio-call-info">
                <h3>{{ partnerName }}</h3>
                <p class="audio-status">
                  <span v-if="callStatus === 'connecting' || !remoteStream">{{ $t('dashboard.call_connecting') }}</span>
                  <span v-else-if="callStatus === 'ringing'">Ringing...</span>
                  <span v-else-if="callStatus === 'connected'" class="voice-active">Voice Connected</span>
                  <span v-else>{{ callStatus }}</span>
                </p>
              </div>
              
              <!-- Wave visualizer micro-animation -->
              <div class="audio-waves" :class="{ 'animating': callStatus === 'connected' }">
                <span class="bar bar-1"></span>
                <span class="bar bar-2"></span>
                <span class="bar bar-3"></span>
                <span class="bar bar-4"></span>
                <span class="bar bar-5"></span>
              </div>
            </div>
          </template>
        </div>

        <div class="call-controls" :class="{ 'minimized': isCallMinimized }">
          <button
            class="control-btn"
            :class="{ active: isMuted }"
            :disabled="isSwitchingCamera || isCleaningUp"
            @click="$emit('toggle-mute')"
          >
            <Icon
              :name="
                isMuted
                  ? 'mdi:microphone-off'
                  : 'mdi:microphone'
              "
            />
          </button>
          <button
            v-if="callType === 'video'"
            class="control-btn"
            :class="{ active: isVideoOff }"
            :disabled="isSwitchingCamera || isCleaningUp"
            @click="$emit('toggle-video')"
          >
            <Icon
              :name="
                isVideoOff
                  ? 'mdi:video-off'
                  : 'mdi:video'
              "
            />
          </button>

          <!-- Camera Flip Button with Loading State -->
          <button
            v-if="callType === 'video' && !isVideoOff"
            class="control-btn"
            :disabled="isSwitchingCamera || isCleaningUp"
            @click="$emit('switch-camera')"
          >
            <div v-if="isSwitchingCamera" class="spinner-small" />
            <Icon v-else name="mdi:camera-flip" />
          </button>

          <!-- Fullscreen Button -->
          <button
            class="control-btn fullscreen-btn"
            :class="{ active: isFullscreen }"
            :disabled="isSwitchingCamera || isCleaningUp"
            @click="$emit('toggle-fullscreen')"
          >
            <Icon :name="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
          </button>

          <button class="control-btn end-call" :disabled="isCleaningUp" @click="$emit('end-call')">
            <Icon name="mdi:phone-hangup" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { gsap } from "gsap";
import { Draggable } from "gsap/all";

const props = defineProps<{
  isInCall: boolean;
  isCallMinimized: boolean;
  partnerName: string;
  callType: 'audio' | 'video';
  callStatus: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSwitchingCamera: boolean;
  isCleaningUp: boolean;
  isFullscreen: boolean;
  remoteStream: any;
  // Refs are managed in parent but bound here
}>();

const emit = defineEmits([
  'toggle-minimize', 
  'toggle-mute', 
  'toggle-video', 
  'switch-camera', 
  'toggle-fullscreen', 
  'end-call'
]);

// Internal PiP logic (Swapping, Dragging)
const isVideosSwapped = ref(false);
const pipWidth = ref(150);
let activeDraggable: any = null;

// Expose refs to parent for binding
const localVideoRef = ref<HTMLVideoElement | null>(null);
const remoteVideoRef = ref<HTMLVideoElement | null>(null);
const remoteAudioRef = ref<HTMLAudioElement | null>(null);

defineExpose({
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef
});

function updateDraggable() {
  if (!import.meta.client) return;

  if (activeDraggable) {
    if (Array.isArray(activeDraggable)) {
      activeDraggable.forEach(d => d.kill());
    } else {
      activeDraggable.kill();
    }
    activeDraggable = null;
  }

  nextTick(() => {
    setTimeout(() => {
      const pipSelector = isVideosSwapped.value ? ".remote-video-container" : ".local-video-container";
      const target = document.querySelector(pipSelector) as HTMLElement;
      if (!target) return;

      const handle = target.querySelector(".resize-handle") as HTMLElement;

      activeDraggable = Draggable.create(target, {
        bounds: ".video-call-overlay",
        edgeResistance: 0.65,
        type: "x,y",
        trigger: target,
        onPress: function() {
          gsap.set(this.target, { zIndex: 20 });
        },
        onClick: (e) => {
          if (!(e.target as HTMLElement).closest(".resize-handle")) {
            toggleVideoSwap();
          }
        }
      })[0];

      if (handle) {
        Draggable.create(handle, {
          type: "x,y",
          onDrag: function() {
            const newWidth = Math.max(100, Math.min(600, pipWidth.value + this.x));
            gsap.set(target, { width: newWidth });
          },
          onDragEnd: function() {
            pipWidth.value = target.offsetWidth;
            gsap.set(this.target, { x: 0, y: 0 });
            updateDraggable();
          }
        });
      }
    }, 150);
  });
}

function toggleVideoSwap() {
  if (!import.meta.client) return;
  
  const localEl = document.querySelector(".local-video-container") as HTMLElement;
  const remoteEl = document.querySelector(".remote-video-container") as HTMLElement;
  if (!localEl || !remoteEl) return;

  const localRect = localEl.getBoundingClientRect();
  const remoteRect = remoteEl.getBoundingClientRect();

  isVideosSwapped.value = !isVideosSwapped.value;

  nextTick(() => {
    const newLocalRect = localEl.getBoundingClientRect();
    const newRemoteRect = remoteEl.getBoundingClientRect();

    if (activeDraggable) {
      activeDraggable.kill();
      activeDraggable = null;
    }

    gsap.set([localEl, remoteEl], { clearProps: "all" });
    
    if (isVideosSwapped.value) {
      gsap.set(remoteEl, { width: pipWidth.value });
    } else {
      gsap.set(localEl, { width: pipWidth.value });
    }

    const localDeltaX = localRect.left - newLocalRect.left;
    const localDeltaY = localRect.top - newLocalRect.top;
    const localScaleX = localRect.width / newLocalRect.width;
    const localScaleY = localRect.height / newLocalRect.height;

    const remoteDeltaX = remoteRect.left - newRemoteRect.left;
    const remoteDeltaY = remoteRect.top - newRemoteRect.top;
    const remoteScaleX = remoteRect.width / newRemoteRect.width;
    const remoteScaleY = remoteRect.height / newRemoteRect.height;

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set([localEl, remoteEl], { clearProps: "transform,scale" });
        updateDraggable();
      }
    });

    tl.fromTo(localEl, 
      { x: localDeltaX, y: localDeltaY, scaleX: localScaleX, scaleY: localScaleY, transformOrigin: "top left" },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: "power3.inOut" }, 0
    );

    tl.fromTo(remoteEl, 
      { x: remoteDeltaX, y: remoteDeltaY, scaleX: remoteScaleX, scaleY: remoteScaleY, transformOrigin: "top left" },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: "power3.inOut" }, 0
    );
  });
}

watch(() => props.isInCall, (val) => {
  if (val && import.meta.client) {
    isVideosSwapped.value = false;
    updateDraggable();
  }
});

onMounted(() => {
  if (props.isInCall) {
    updateDraggable();
  }
});
</script>

<style lang="scss" scoped>
.video-call-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);

  &.is-fullscreen {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100dvw !important;
    height: 100dvh !important;
    z-index: 99999 !important;
    border-radius: 0 !important;
  }

  .call-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; }
  .call-header {
    padding: 15px 20px;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: white;
    .call-partner-info { display: flex; align-items: center; gap: 10px; .call-icon { color: #4caf50; animation: pulse 2s infinite; } }
    .minimize-btn { background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; }
  }

  .video-grid {
    flex: 1;
    position: relative;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    &.videos-swapped {
      .remote-video-container {
        position: absolute !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 150px !important;
        height: auto !important;
        aspect-ratio: 16/9 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        border: 2px solid rgba(255, 255, 255, 0.3) !important;
        z-index: 10 !important;
        
        .remote-video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0 !important;
        }
      }
      
      .local-video-container {
        position: static !important;
        bottom: auto !important;
        right: auto !important;
        width: 100% !important;
        height: 100% !important;
        aspect-ratio: auto !important;
        border-radius: 0 !important;
        border: none !important;
        z-index: 1 !important;
        
        .local-video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      }
    }
  }
  .remote-video-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .remote-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @include tablet-to-up {
      height: 90%;
      width: 90%;
      .remote-video {
        object-fit: contain;
        border-radius: 12px;
      }
    }
  }
  .local-video-container {
    position: absolute;
    bottom: 20px;
    right: 20px;
    width: 150px;
    aspect-ratio: 16/9;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.3);
    z-index: 20;
    cursor: grab;

    &:active { cursor: grabbing; }

    .local-video { width: 100%; height: 100%; object-fit: cover; }

    .resize-handle {
      position: absolute;
      top: 0;
      left: 0;
      width: 30px;
      height: 30px;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: nwse-resize;
      z-index: 21;
      border-bottom-right-radius: 8px;
      
      &:hover {
        background: var(--accent-primary);
      }
    }
  }

  .call-controls {
    display: flex;
    justify-content: center;
    gap: 20px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.6);
    &.minimized {
      position: fixed;
      top: 80px;
      right: 20px;
      border-radius: 30px;
      padding: 10px 15px;
      flex-direction: column;
      width: auto;
      background: var(--bg-secondary);
      border: 1px solid var(--lines-color);
      z-index: 101;
      .control-btn { width: 40px; height: 40px; }
    }
    .control-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      &:hover { background: rgba(255, 255, 255, 0.2); }
      &.active { background: var(--accent-error); }
      &.end-call { background: #ff3b30; }
    }
  }
}

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }

@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent-secondary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Premium Audio Calling Visuals */
.audio-only-grid {
  background: radial-gradient(circle at center, #1b1c2b 0%, #0a0b12 100%) !important;
}

.audio-call-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
  height: 100%;
  width: 100%;
  color: white;

  .audio-avatar-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;

    .avatar-large-glow {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: var(--gradient-start);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      font-weight: bold;
      color: white;
      box-shadow: 0 0 35px rgba(255, 255, 255, 0.25);
      z-index: 2;
    }

    .pulse-ring {
      position: absolute;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.25);
      animation: audioPulse 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      z-index: 1;
      opacity: 0;

      &.ring-2 {
        animation-delay: 1s;
      }
      &.ring-3 {
        animation-delay: 2s;
      }
    }
  }

  .audio-call-info {
    text-align: center;
    h3 {
      font-size: 1.6rem;
      margin: 0 0 8px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .audio-status {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
      
      .voice-active {
        color: #4caf50;
        font-weight: 500;
        text-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
      }
    }
  }

  .audio-waves {
    display: flex;
    align-items: flex-end;
    gap: 5px;
    height: 40px;
    margin-top: 10px;

    .bar {
      width: 4px;
      background: var(--accent-primary);
      border-radius: 2px;
      height: 6px;
      transition: height 0.25s ease;
    }

    &.animating {
      .bar-1 { animation: wave 1.2s ease-in-out infinite; }
      .bar-2 { animation: wave 0.9s ease-in-out infinite 0.2s; }
      .bar-3 { animation: wave 1.4s ease-in-out infinite 0.4s; }
      .bar-4 { animation: wave 1.1s ease-in-out infinite 0.1s; }
      .bar-5 { animation: wave 1.3s ease-in-out infinite 0.3s; }
    }
  }
}

@keyframes audioPulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.3);
    opacity: 0;
  }
}

@keyframes wave {
  0%, 100% { height: 6px; }
  50% { height: 38px; }
}
</style>
