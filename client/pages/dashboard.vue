<template>
  <h1>develop me yo</h1>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Dashboard for registered users | Bader Idris',
  description: 'Access exclusive content, resources, and services on Bader Idris\'s platform. Join a tech-savvy community led by a skilled full-stack developer.',
})

definePageMeta({
  // @ts-ignore
  middleware: 'auth', // Use the auth middleware
  requiresAdmin: true, // Require admin role for this page
})
</script>
