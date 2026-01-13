<template>
  <div class="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-4">
    <!-- Login Screen -->
    <transition
      mode="out-in"
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="!username"
        class="w-full max-w-md bg-neutral-800/50 backdrop-blur-xl rounded-2xl border border-neutral-700 p-8 shadow-2xl"
      >
        <div class="text-center mb-8">
          <div
            class="w-16 h-16 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/30"
          >
            <ChatIcon class="h-8 w-8 text-white" />
          </div>
          <h2 class="text-3xl font-bold mb-2">Welcome Back</h2>
          <p class="text-neutral-400">Connect with your team instantly</p>
        </div>

        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-neutral-400 mb-2">Username/ID</label>
            <div class="relative group">
              <input
                v-model="inputUsername"
                type="text"
                placeholder="Enter your username"
                class="w-full bg-neutral-900/50 border border-neutral-700 rounded-xl py-3 px-4 pl-10 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all group-hover:border-neutral-600"
                @keyup.enter="handleLogin"
              />
              <div
                class="absolute left-3 top-3.5 text-neutral-500 group-focus-within:text-blue-500 transition-colors"
              >
                <UserIcon class="h-5 w-5" />
              </div>
            </div>
          </div>

          <button
            @click="handleLogin"
            class="w-full bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Log In
          </button>
        </div>
      </div>

      <!-- Chat Interface -->
      <div
        v-else
        class="w-full h-[90vh] max-w-7xl bg-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex border border-neutral-700"
      >
        <!-- Sidebar -->
        <div class="w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col">
          <div class="p-6">
            <div class="flex items-center gap-3 mb-8">
              <div
                class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white overflow-hidden ring-2 ring-blue-500/20"
              >
                <img
                  :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`"
                  alt="avatar"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold truncate text-white">{{ username }}</h3>
                <p class="text-xs text-green-500 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Active Now
                </p>
              </div>
            </div>

            <button
              class="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2 border border-blue-500/20"
            >
              <ChatIcon class="h-5 w-5" />
              Chats
            </button>
          </div>

          <div class="px-6 pb-4">
            <div class="relative group">
              <input
                type="text"
                placeholder="Search messages..."
                class="w-full bg-neutral-800 border-none rounded-xl py-2 px-4 pl-10 text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <div
                class="absolute left-3 top-2.5 text-neutral-500 group-focus-within:text-blue-500 transition-colors"
              >
                <SearchIcon class="h-4 w-4" />
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-4 space-y-2">
            <!-- Contact Items -->
            <div
              v-for="contact in mockContacts"
              :key="contact.id"
              class="p-3 rounded-xl hover:bg-neutral-800 cursor-pointer transition-all flex gap-3 items-center group"
              :class="{ 'bg-neutral-800 border-l-2 border-blue-500': contact.active }"
            >
              <div class="relative">
                <div
                  class="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-white font-bold overflow-hidden"
                >
                  <img
                    :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.name}`"
                    :alt="contact.name"
                  />
                </div>
                <span
                  v-if="contact.online"
                  class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-neutral-900 rounded-full"
                ></span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-center mb-0.5">
                  <h3
                    class="font-medium truncate text-sm"
                    :class="contact.active ? 'text-white' : 'text-neutral-300'"
                  >
                    {{ contact.name }}
                  </h3>
                  <span class="text-[10px] text-neutral-500">{{ contact.time }}</span>
                </div>
                <p
                  class="text-xs truncate"
                  :class="contact.unread ? 'text-blue-400 font-medium' : 'text-neutral-500'"
                >
                  {{ contact.lastMsg }}
                </p>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-neutral-800">
            <div class="flex items-center justify-between">
              <div
                class="flex items-center gap-3 text-neutral-400 hover:text-white cursor-pointer transition-colors"
                @click="username = ''"
              >
                <LogoutIcon class="h-5 w-5" />
                <span class="text-sm">Logout</span>
              </div>
              <SettingsIcon
                class="h-5 w-5 text-neutral-500 hover:text-white cursor-pointer transition-colors"
              />
            </div>
          </div>
        </div>

        <!-- Main Chat Area -->
        <div class="flex-1 flex flex-col bg-neutral-900/50 backdrop-blur-sm">
          <!-- Header -->
          <div
            class="h-20 border-b border-neutral-800 flex items-center justify-between px-8 bg-neutral-800/30"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-10 h-10 rounded-full bg-linear-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 overflow-hidden"
              >
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=DesignTeam"
                  alt="Design Team"
                />
              </div>
              <div>
                <h3 class="font-bold text-lg text-white">Design Team</h3>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span class="text-xs text-neutral-400">8 members online</span>
                </div>
              </div>
            </div>
            <div class="flex gap-5 text-neutral-400">
              <button class="hover:text-blue-500 transition-colors">
                <CallIcon class="w-5 h-5" />
              </button>
              <button class="hover:text-blue-500 transition-colors">
                <VideoCameraIcon class="w-5 h-5" />
              </button>
              <button class="hover:text-blue-500 transition-colors">
                <MoreIcon class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div class="flex-1 p-8 overflow-y-auto space-y-8 custom-scrollbar">
            <!-- Date Divider -->
            <div class="flex justify-center">
              <span
                class="bg-neutral-800 text-neutral-500 text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase"
                >Today, Oct 24</span
              >
            </div>

            <div
              v-for="(msg, index) in mockMessages"
              :key="index"
              class="flex gap-4"
              :class="{ 'flex-row-reverse': msg.isMe }"
            >
              <div
                class="w-10 h-10 rounded-full bg-neutral-700 shrink-0 overflow-hidden ring-2 ring-neutral-800"
              >
                <img
                  :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender}`"
                  :alt="msg.sender"
                />
              </div>
              <div class="max-w-[60%] flex flex-col" :class="{ 'items-end': msg.isMe }">
                <div
                  class="flex items-baseline gap-2 mb-1.5"
                  :class="{ 'flex-row-reverse': msg.isMe }"
                >
                  <span class="font-bold text-xs text-neutral-300">{{ msg.sender }}</span>
                  <span class="text-[10px] text-neutral-500">{{ msg.time }}</span>
                </div>
                <div
                  class="p-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all hover:shadow-md"
                  :class="
                    msg.isMe
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700/50'
                  "
                >
                  {{ msg.text }}
                </div>
                <div v-if="msg.isMe" class="mt-1 flex items-center gap-1.5">
                  <div
                    class="w-3.5 h-3.5 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden ring-1 ring-blue-500/20"
                  >
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Emily" alt="read" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="p-6 bg-neutral-900/50 border-t border-neutral-800">
            <div
              class="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-2.5 flex items-end gap-3 focus-within:border-blue-500/50 focus-within:bg-neutral-800 transition-all"
            >
              <div class="flex gap-1 p-1.5 text-neutral-500">
                <button
                  class="p-1.5 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  <EmojiIcon class="w-5 h-5" />
                </button>
                <button
                  class="p-1.5 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  <AttachIcon class="w-5 h-5" />
                </button>
                <button
                  class="p-1.5 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  <ImageIcon class="w-5 h-5" />
                </button>
                <button
                  class="p-1.5 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  <MicrophoneIcon class="w-5 h-5" />
                </button>
              </div>
              <textarea
                v-model="messageInput"
                rows="1"
                placeholder="Write a message..."
                class="flex-1 bg-transparent border-none text-white placeholder-neutral-500 focus:ring-0 resize-none py-3 text-sm max-h-32 custom-scrollbar"
                @keyup.enter.exact.prevent="sendMessage"
              ></textarea>
              <button
                @click="sendMessage"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 mb-1 mr-1 flex items-center gap-2 text-sm font-semibold active:scale-95"
              >
                Send
                <SendIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  ChatIcon,
  UserIcon,
  SearchIcon,
  LogoutIcon,
  SettingIcon as SettingsIcon,
  CallIcon,
  VideoCameraIcon,
  MoreIcon,
  SmileIcon as EmojiIcon,
  AttachIcon,
  ImageIcon,
  MicrophoneIcon,
  SendIcon,
} from 'tdesign-icons-vue-next'

const inputUsername = ref('')
const username = ref('')
const messageInput = ref('')

const handleLogin = () => {
  if (inputUsername.value.trim()) {
    username.value = inputUsername.value.trim()
  }
}

const sendMessage = () => {
  if (messageInput.value.trim()) {
    mockMessages.value.push({
      sender: username.value,
      time: '10:45 AM',
      text: messageInput.value.trim(),
      isMe: true,
    })
    messageInput.value = ''
  }
}

const mockContacts = [
  {
    id: 1,
    name: 'Design Team',
    lastMsg: 'Alex: The glassmorphism looks great!',
    time: '10:45 AM',
    active: true,
    online: true,
    unread: false,
  },
  {
    id: 2,
    name: 'Sarah Jenkins',
    lastMsg: "Let's sync on the dark mode palette.",
    time: 'Yesterday',
    active: false,
    online: true,
    unread: false,
  },
  {
    id: 3,
    name: 'Michael Chen',
    lastMsg: 'logo_final.svg',
    time: 'Monday',
    active: false,
    online: false,
    unread: false,
  },
  {
    id: 4,
    name: 'Emily Watson',
    lastMsg: "I've shared the Figma file with you.",
    time: 'Oct 12',
    active: false,
    online: false,
    unread: false,
  },
]

const mockMessages = ref([
  {
    sender: 'Michael Chen',
    time: '10:42 AM',
    text: "Hey team, I've updated the primary UI components. Let me know what you think about the new contrast ratios.",
    isMe: false,
  },
  {
    sender: 'Alex Rivera',
    time: '10:45 AM',
    text: 'The glassmorphism looks great! The accessibility score for the primary buttons is also much better now.',
    isMe: true,
  },
  {
    sender: 'Sarah Jenkins',
    time: '10:48 AM',
    text: 'Agreed. Ready to push to production? 🚀',
    isMe: false,
  },
])
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

textarea {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
</style>
