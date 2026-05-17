<template>
  <div class="custom-loader" />
</template>

<style lang="scss">
.custom-loader {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 8px solid;
  border-color: #766df4 #0000;
  animation: s1 1s infinite;
}

@keyframes s1 {
  to {
    transform: rotate(0.5turn);
  }
}
</style>