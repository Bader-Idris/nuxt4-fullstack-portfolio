<template>
  <div class="input-area" @click="chatInputRef?.focus()">
    <ChatInput
      ref="chatInputRef"
      placeholder="Message"
      @send="$emit('send', $event)"
    />
  </div>
</template>

<script setup lang="ts">
const chatInputRef = ref(null);

defineExpose({
  focus: () => chatInputRef.value?.focus()
});

defineEmits(['send']);
</script>

<style lang="scss" scoped>
.input-area { padding: 10px 20px 20px; }
</style>
