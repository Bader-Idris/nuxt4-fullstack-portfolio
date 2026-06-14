<template>
  <div class="contact-search-bar" :class="{ 'is-active': isFocused || query }">
    <div class="search-input-container">
      <Icon name="mdi:magnify" class="search-icon" />
      <input
        v-model="query"
        type="text"
        placeholder="Search recent chats..."
        @focus="isFocused = true"
        @blur="handleBlur"
      />
      <button v-if="query" class="clear-btn" @click="clearSearch">
        <Icon name="mdi:close" />
      </button>
    </div>

    <!-- Results Dropdown -->
    <Transition name="fade-slide">
      <div v-if="isFocused && filteredContacts.length > 0" class="search-results">
        <ul>
          <li
            v-for="contact in filteredContacts"
            :key="contact.userId"
            class="result-item"
            @mousedown="selectContact(contact)"
          >
            <div class="user-avatar-mini">
              <img v-if="contact.avatar" :src="contact.avatar" class="avatar-img" />
              <ScriptGravatar v-else-if="contact.avatarHash" :hash="contact.avatarHash" :size="30" class="avatar-img rounded-full" />
              <div v-else class="avatar-placeholder-mini">{{ contact.name.charAt(0) }}</div>
            </div>
            <div class="user-info-text">
              <span class="user-name">{{ contact.name }}</span>
              <span class="user-role">{{ contact.role }}</span>
            </div>
            <span v-if="contact.isOnline" class="status-dot online" />
          </li>
        </ul>
      </div>
      <div v-else-if="isFocused && query && filteredContacts.length === 0" class="no-results">
        No contacts found sharing a chat history.
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useToggle } from "@vueuse/core";

interface Contact {
  userId: string;
  name: string;
  avatar?: string;
  avatarHash?: string;
  role: string;
  isOnline: boolean;
}

const props = defineProps<{
  contacts: Contact[];
}>();

const emit = defineEmits(["select"]);

const query = ref("");
const isFocused = ref(false);

const filteredContacts = computed(() => {
  if (!query.value) return props.contacts.slice(0, 10); // Show recent 10 if no query
  const q = query.value.toLowerCase().trim();
  return props.contacts.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.userId.toLowerCase().includes(q)
  );
});

const handleBlur = () => {
  // Delay blur to allow clicking the result item
  setTimeout(() => {
    isFocused.value = false;
  }, 200);
};

const selectContact = (contact: Contact) => {
  emit("select", contact.userId);
  query.value = "";
  isFocused.value = false;
};

const clearSearch = () => {
  query.value = "";
};

const clearSearchAction = () => {
  query.value = "";
};
</script>

<style lang="scss" scoped>
.contact-search-bar {
  position: relative;
  width: 100%;
  margin-bottom: 15px;
  z-index: 50;

  .search-input-container {
    display: flex;
    align-items: center;
    background: var(--bg-primary);
    border: 1px solid var(--lines-color);
    border-radius: 10px;
    padding: 8px 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:focus-within {
      border-color: var(--accent-primary);
      box-shadow: 0 0 15px rgba(var(--accent-primary-rgb), 0.15);
      background: var(--bg-primary-hovered);
    }

    .search-icon {
      color: var(--text-secondary);
      font-size: 1.2rem;
      margin-right: 10px;
    }

    input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 0.9rem;
      &::placeholder {
        color: var(--text-secondary);
        opacity: 0.7;
      }
    }

    .clear-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
      &:hover {
        color: var(--accent-error);
      }
    }
  }
}

.search-results {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--lines-color);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  max-height: 300px;
  overflow-y: auto;
  backdrop-filter: blur(10px);
  animation: slideDown 0.2s ease-out;

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
}

.result-item {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(var(--lines-color-rgb), 0.1);

  &:last-child { border-bottom: none; }

  &:hover {
    background: var(--bg-primary-hovered);
    transform: translateX(5px);
  }

  .user-avatar-mini {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    overflow: hidden;
    margin-right: 12px;
    background: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;

    .avatar-placeholder-mini {
      font-size: 0.9rem;
      font-weight: bold;
      color: white;
      background: var(--gradient-start);
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .user-info-text {
    display: flex;
    flex-direction: column;
    flex: 1;

    .user-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .user-role {
      font-size: 0.7rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    &.online {
      background: #4caf50;
      box-shadow: 0 0 5px #4caf50;
    }
  }
}

.no-results {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  padding: 15px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
  border-radius: 12px;
  border: 1px solid var(--lines-color);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.2s ease;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
