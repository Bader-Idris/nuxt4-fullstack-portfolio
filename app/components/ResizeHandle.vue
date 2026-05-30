<template>
  <div
    class="resize-handle"
    :class="{ 'is-resizing': isResizing }"
    @mousedown="startResizing"
  >
    <div class="line"></div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(["resize", "start", "stop"]);

const isResizing = ref(false);

const startResizing = (e: MouseEvent) => {
  isResizing.value = true;
  emit("start");
  
  const onMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return;
    emit("resize", e.clientX);
  };

  const onMouseUp = () => {
    isResizing.value = false;
    emit("stop");
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
  };

  document.body.style.cursor = "col-resize";
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
};
</script>

<style lang="scss" scoped>
.resize-handle {
  width: 4px;
  height: 100%;
  cursor: col-resize;
  position: absolute;
  right: -2px;
  top: 0;
  z-index: 100;
  transition: background-color 0.2s;
  display: flex;
  justify-content: center;

  @include mobile {
    display: none; // Disable resizing on mobile
  }

  &:hover, &.is-resizing {
    background-color: rgba($accent2, 0.3);
    
    .line {
      background-color: $accent2;
    }
  }

  .line {
    width: 1px;
    height: 100%;
    background-color: transparent;
    transition: background-color 0.2s;
  }
}
</style>
