<template>
  <div
    class="min-h-screen bg-neutral-900 text-white flex items-stretch sm:items-center justify-center p-0 sm:p-2"
  >
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
        class="w-full max-w-md bg-neutral-800/50 backdrop-blur-xl rounded-2xl border border-neutral-700 p-4 shadow-2xl"
      >
        <div class="text-center mb-4">
          <div
            class="w-16 h-16 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/30"
          >
            <ChatIcon class="h-8 w-8 text-white" />
          </div>
          <h2 class="text-3xl font-bold mb-2">欢迎回来</h2>
          <p class="text-neutral-400">即刻与团队连接</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-400 mb-2">用户名 / ID</label>
            <div class="relative group">
              <input
                v-focus
                v-model="inputUsername"
                type="text"
                placeholder="请输入您的用户名"
                class="w-full bg-neutral-900/50 border border-neutral-700 rounded-xl py-3 px-4 pl-10 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all group-hover:border-neutral-600"
                @keyup.enter="handleLogin"
              />
              <div
                class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-blue-500 transition-colors flex items-center"
              >
                <UserIcon class="h-5 w-5" />
              </div>
            </div>
          </div>

          <button
            @click="handleLogin"
            class="w-full bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            登录
          </button>
        </div>
      </div>

      <!-- Chat Interface -->
      <div
        v-else
        class="w-full h-dvh sm:h-[90vh] max-w-7xl bg-neutral-800 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row border border-neutral-700"
      >
        <!-- Sidebar -->
        <div
          class="w-full sm:w-80 h-full bg-neutral-900 sm:border-r border-neutral-800 flex flex-col"
          :class="selectedUser ? 'hidden sm:flex' : ''"
        >
          <div class="p-2 sm:p-2 pb-0">
            <div class="flex items-center gap-2 mb-4">
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
                  在线
                </p>
              </div>
            </div>
          </div>

          <div class="px-2 sm:px-2 pb-2">
            <div class="relative group">
              <input
                type="text"
                placeholder="搜索消息..."
                class="w-full bg-neutral-800 border-none rounded-xl py-2 px-4 pl-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <div
                class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-blue-500 transition-colors flex items-center"
              >
                <SearchIcon class="h-4 w-4" />
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-2 sm:px-2 space-y-2">
            <!-- Contact Items -->
            <div
              v-for="name in displayUsers"
              :key="name"
              class="p-2 rounded-xl hover:bg-neutral-800 cursor-pointer transition-all flex gap-3 items-center group"
              :class="{ 'bg-neutral-800 border-l-2 border-blue-500': selectedUser === name }"
              @click="selectUser(name)"
            >
              <div class="relative">
                <div
                  class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-700 flex items-center justify-center text-white font-bold overflow-hidden"
                >
                  <img
                    :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`"
                    :alt="name"
                  />
                </div>
                <span
                  class="absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-neutral-900 rounded-full"
                  :class="isUserOnline(name) ? 'bg-green-500 animate-pulse' : 'bg-neutral-500'"
                ></span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-center mb-0.5">
                  <h3 class="font-medium truncate text-sm sm:text-base text-neutral-300">
                    {{ name }}
                  </h3>
                  <span
                    v-if="unreadCounts[name]"
                    class="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center shrink-0 ml-2"
                  >
                    {{ unreadCounts[name] > 99 ? '99+' : unreadCounts[name] }}
                  </span>
                </div>
                <div class="flex justify-between items-center min-w-0">
                  <p class="text-xs text-neutral-500 truncate mr-2">
                    {{ getLastMessage(name) || (isUserOnline(name) ? '在线' : '离线') }}
                  </p>
                </div>
              </div>
            </div>
            <div v-if="usersLoading" class="px-3 py-2 text-xs text-neutral-500">加载中...</div>
            <div v-else-if="usersError" class="px-3 py-2 text-xs text-red-400">
              {{ usersError }}
            </div>
            <div
              v-else-if="username && users.length === 0"
              class="px-3 py-2 text-base sm:text-lg text-neutral-500 text-center"
            >
              暂无用户
            </div>
          </div>

          <div class="p-2 border-t border-neutral-800">
            <div class="flex items-center justify-between">
              <div
                class="flex items-center gap-3 text-neutral-400 hover:text-white cursor-pointer transition-colors"
                @click="logout"
              >
                <LogoutIcon class="h-5 w-5" />
                <span class="text-sm">退出登录</span>
              </div>
              <SettingsIcon
                class="h-5 w-5 text-neutral-500 hover:text-white cursor-pointer transition-colors"
              />
            </div>
          </div>
        </div>

        <!-- Main Chat Area -->
        <div
          class="flex-1 flex flex-col bg-neutral-900/50 backdrop-blur-sm overflow-hidden h-full"
          :class="!selectedUser ? 'hidden sm:flex' : ''"
        >
          <!-- Header -->
          <div
            class="h-16 sm:h-16 border-b border-neutral-800 flex items-center justify-between px-2 sm:px-4 bg-neutral-800/30"
          >
            <template v-if="selectedUser">
              <div class="flex items-center gap-3 sm:gap-4">
                <button
                  class="sm:hidden h-10 w-10 flex items-center justify-center rounded-xl hover:bg-neutral-800/60 text-neutral-300"
                  @click="backToList"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 18l-6-6 6-6"
                    />
                  </svg>
                </button>
                <div
                  class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-linear-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 overflow-hidden"
                >
                  <img
                    :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser}`"
                    :alt="selectedUser"
                  />
                </div>
                <div>
                  <h3 class="font-bold text-base sm:text-lg text-white">{{ selectedUser }}</h3>
                  <div class="flex items-center gap-2">
                    <span
                      class="w-2 h-2 rounded-full"
                      :class="selectedUserOnline ? 'bg-green-500' : 'bg-neutral-500'"
                    ></span>
                    <span class="text-[10px] sm:text-xs text-neutral-400">{{
                      selectedUserOnline ? '在线' : '离线'
                    }}</span>
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
            </template>
            <template v-else>
              <div class="text-sm font-medium text-neutral-400">选择一个用户开始聊天</div>
            </template>
          </div>

          <!-- Messages -->
          <div
            v-if="selectedUser"
            ref="messagesContainerRef"
            class="flex-1 p-2 sm:p-2 overflow-y-auto space-y-2 sm:space-y-4 custom-scrollbar min-h-0"
          >
            <!-- Date Divider -->
            <div class="flex justify-center">
              <span
                class="bg-neutral-800 text-neutral-500 text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase"
                >{{ dayjs().format('Today, MMM D') }}</span
              >
            </div>

            <div
              v-for="(msg, index) in currentMessages"
              :key="index"
              class="flex gap-3 sm:gap-4"
              :class="{ 'flex-row-reverse': msg.isMe }"
            >
              <div
                class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-neutral-700 shrink-0 overflow-hidden ring-2 ring-neutral-800"
              >
                <img
                  :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender}`"
                  :alt="msg.sender"
                />
              </div>
              <div
                class="max-w-[80%] sm:max-w-[60%] flex flex-col"
                :class="{ 'items-end': msg.isMe }"
              >
                <div
                  class="flex items-baseline gap-1.5 sm:gap-2 mb-1.5"
                  :class="{ 'flex-row-reverse': msg.isMe }"
                >
                  <span class="font-bold text-[11px] sm:text-xs text-neutral-300">{{
                    msg.sender
                  }}</span>
                  <span class="text-[9px] sm:text-[10px] text-neutral-500">{{ msg.time }}</span>
                </div>
                <div
                  class="p-2 sm:p-2 rounded-2xl text-sm leading-relaxed shadow-sm transition-all hover:shadow-md w-fit"
                  :class="[
                    msg.isMe
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700/50',
                  ]"
                  @contextmenu="onContextMenu($event, msg)"
                >
                  <!-- Reply Context -->
                  <div
                    v-if="msg.replyTo"
                    class="mb-2 p-2 rounded-lg text-xs flex flex-col gap-1"
                    :class="
                      msg.isMe
                        ? 'bg-black/20 border-l-2 border-white/50 text-white/90'
                        : 'bg-neutral-900/40 border-l-2 border-blue-500 text-neutral-300'
                    "
                  >
                    <span class="font-bold">{{ msg.replyTo.sender }}</span>
                    <span v-if="msg.replyTo.type === 'text'" class="truncate opacity-90">{{
                      msg.replyTo.text
                    }}</span>
                    <span
                      v-else-if="msg.replyTo.type === 'image'"
                      class="flex items-center gap-1 opacity-90"
                    >
                      <ImageIcon class="w-3 h-3" /> 图片
                    </span>
                  </div>

                  <template v-if="msg.type === 'text'">
                    <template v-for="(part, pIdx) in parseMessage(msg.text || '')" :key="pIdx">
                      <span v-if="part.type === 'text'">{{ part.content }}</span>
                      <Icon
                        v-else
                        :icon="`fluent-emoji-flat:${part.content}`"
                        class="inline-block w-[1.05em] h-[1.05em] align-text-bottom"
                      />
                    </template>
                  </template>
                  <template v-else-if="msg.type === 'image'">
                    <img
                      :src="msg.image"
                      alt="image"
                      class="max-w-[200px] rounded-xl border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                      @click="previewImage(msg.image || '')"
                    />
                  </template>
                  <template v-else-if="msg.type === 'audio'">
                    <audio controls :src="msg.audio" class="max-w-[240px] h-10"></audio>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else
            class="flex-1 flex flex-col items-center justify-center text-neutral-500 gap-4"
          >
            <ChatIcon class="w-16 h-16 opacity-20" />
            <p>从左侧选择一个用户开始聊天</p>
          </div>

          <!-- Input Area -->
          <div v-if="selectedUser" class="p-2 sm:p-2 bg-neutral-900/50 border-t border-neutral-800">
            <!-- Replying Banner -->
            <div
              v-if="replyingMessage"
              class="mb-2 p-2 bg-neutral-800/80 backdrop-blur-md rounded-xl border border-neutral-700/50 flex items-center justify-between animate-fade-in-up"
            >
              <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-1 h-8 bg-blue-500 rounded-full"></div>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-bold text-blue-400"
                    >回复 {{ replyingMessage.sender }}</span
                  >
                  <span
                    v-if="replyingMessage.type === 'text'"
                    class="text-xs text-neutral-300 truncate"
                    >{{ replyingMessage.text }}</span
                  >
                  <span
                    v-else-if="replyingMessage.type === 'image'"
                    class="text-xs text-neutral-300 flex items-center gap-1"
                  >
                    <ImageIcon class="w-3 h-3" /> 图片
                  </span>
                </div>
              </div>
              <button
                @click="replyingMessage = null"
                class="p-1.5 hover:bg-neutral-700 rounded-full text-neutral-400 hover:text-white transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <div
              class="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-2.5 flex items-center gap-2 focus-within:border-blue-500/50 focus-within:bg-neutral-800 transition-all relative"
            >
              <input
                ref="imageFileInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleImageSelected"
              />
              <!-- Emoji Picker Popover -->
              <transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="transform scale-95 opacity-0 -translate-y-2"
                enter-to-class="transform scale-100 opacity-100 translate-y-0"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="transform scale-100 opacity-100 translate-y-0"
                leave-to-class="transform scale-95 opacity-0 -translate-y-2"
              >
                <div
                  v-if="showEmojiPicker"
                  ref="emojiPickerRef"
                  class="absolute bottom-full left-0 mb-4 w-72 bg-neutral-800 border border-neutral-700 rounded-2xl shadow-2xl p-4 z-50 overflow-hidden"
                >
                  <div class="flex justify-between items-center mb-3">
                    <span class="text-xs font-bold text-neutral-400 uppercase tracking-widest"
                      >选择表情</span
                    >
                    <button
                      @click="showEmojiPicker = false"
                      class="text-neutral-500 hover:text-white transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                    </button>
                  </div>
                  <div
                    class="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1"
                  >
                    <button
                      v-for="emoji in emojiList"
                      :key="emoji"
                      class="p-1.5 hover:bg-neutral-700 rounded-lg transition-all flex items-center justify-center group"
                      @click="addEmoji(emoji)"
                    >
                      <Icon
                        :icon="`fluent-emoji-flat:${emoji}`"
                        class="w-7 h-7 transform group-hover:scale-125 transition-transform"
                      />
                    </button>
                  </div>
                </div>
              </transition>

              <div class="flex items-center gap-1 text-neutral-500">
                <button
                  class="h-10 w-10 flex items-center justify-center hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                  :class="{ 'text-blue-500 bg-blue-500/10': showEmojiPicker }"
                  @click="showEmojiPicker = !showEmojiPicker"
                >
                  <EmojiIcon class="w-5 h-5 block" />
                </button>
                <button
                  class="h-10 w-10 flex items-center justify-center hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  <AttachIcon class="w-5 h-5 block" />
                </button>
                <button
                  class="h-10 w-10 flex items-center justify-center hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                  @click="openImagePicker"
                >
                  <ImageIcon class="w-5 h-5 block" />
                </button>
                <button
                  class="h-10 w-10 flex items-center justify-center hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                  @click="startRecording"
                >
                  <MicrophoneIcon class="w-5 h-5 block" />
                </button>
              </div>
              <div class="relative flex-1 flex items-center">
                <div
                  v-if="isRecording"
                  class="absolute inset-0 z-20 flex items-center justify-between px-4 bg-neutral-800 rounded-xl"
                >
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span class="text-white font-mono">{{
                      formatRecordingTime(recordingTime)
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="text-xs text-neutral-400 hover:text-white px-2 py-1"
                      @click="cancelRecording"
                    >
                      取消
                    </button>
                    <button
                      class="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                      @click="stopRecording"
                    >
                      发送
                    </button>
                  </div>
                </div>

                <div
                  ref="inputOverlayRef"
                  class="absolute inset-0 z-10 py-2 text-sm sm:text-base leading-5 text-white whitespace-pre-wrap wrap-break-word pointer-events-none overflow-y-auto max-h-32 custom-scrollbar"
                  :class="{ 'opacity-0': isComposing }"
                >
                  <template v-if="messageInput">
                    <template v-for="(part, pIdx) in parseMessage(messageInput)" :key="pIdx">
                      <span v-if="part.type === 'text'">{{ part.content }}</span>
                      <Icon
                        v-else
                        :icon="`fluent-emoji-flat:${part.content}`"
                        class="inline-block w-[1.05em] h-[1.05em] align-text-bottom"
                      />
                    </template>
                  </template>
                </div>
                <textarea
                  ref="textareaRef"
                  v-model="messageInput"
                  rows="1"
                  placeholder="写点什么..."
                  class="relative z-0 w-full bg-transparent border-none caret-white placeholder-neutral-500 focus:outline-none focus:ring-0 resize-none py-2 text-sm sm:text-base leading-5 max-h-32 overflow-y-auto custom-scrollbar"
                  :class="isComposing ? 'text-white' : 'text-transparent'"
                  @compositionstart="handleCompositionStart"
                  @compositionend="handleCompositionEnd"
                  @scroll="syncInputOverlayScroll"
                  @keydown.enter.exact.prevent="sendMessage"
                ></textarea>
              </div>
              <button
                @click="sendMessage"
                class="h-10 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 text-sm sm:text-base font-semibold active:scale-95"
              >
                发送
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { onClickOutside } from '@vueuse/core'
import ContextMenu from '@imengyu/vue3-context-menu'
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import fluentEmojiChars from '@iconify-json/fluent-emoji-flat/chars.json'
import fluentEmojiMetadata from '@iconify-json/fluent-emoji-flat/metadata.json'
import { io, type Socket } from 'socket.io-client'
import dayjs from 'dayjs'
import { api as viewerApi } from 'v-viewer'
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

type Message = {
  sender: string
  time: string
  type: 'text' | 'image' | 'audio' | 'file'
  isMe: boolean
  text?: string
  image?: string
  audio?: string
  file?: string
  replyTo?: {
    sender: string
    text?: string
    image?: string
    type: 'text' | 'image' | 'audio' | 'file'
  }
}

const inputUsername = ref('')
const username = ref('')
const selectedUser = ref<string | null>(null)
const messageInput = ref('')
const isComposing = ref(false)
const isRecording = ref(false)
const recordingTime = ref(0)
const recordingTimer = ref<number | null>(null)
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioChunks = ref<Blob[]>([])
const showEmojiPicker = ref(false)
const emojiPickerRef = ref(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const inputOverlayRef = ref<HTMLDivElement | null>(null)
const imageFileInputRef = ref<HTMLInputElement | null>(null)
const socketStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
const socketErrorMessage = ref('')
const socketRef = ref<Socket | null>(null)
const allMessages = ref<Record<string, Message[]>>({})
const unreadCounts = ref<Record<string, number>>({})
const replyingMessage = ref<Message | null>(null)
const messagesContainerRef = ref<HTMLDivElement | null>(null)

const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
}

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('此浏览器不支持桌面通知')
    return
  }
  console.log('当前通知权限状态:', Notification.permission)
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission()
    console.log('用户选择的权限状态:', permission)
  }
}

const playNotificationSound = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // 提示音：清脆的 "叮" 声
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5
    oscillator.frequency.exponentialRampToValueAtTime(587, ctx.currentTime + 0.3) // D5

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.3)
  } catch (e) {
    console.error('Audio error:', e)
  }
}

const sendSystemNotification = (sender: string, body: string) => {
  // 播放应用内提示音
  playNotificationSound()

  if (!('Notification' in window)) return

  console.log('尝试发送通知', {
    permission: Notification.permission,
    sender,
    selectedUser: selectedUser.value,
    visibility: document.visibilityState,
    focused: document.hasFocus(),
  })

  if (Notification.permission === 'granted') {
    // 移除聚焦检查，始终发送通知
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options: any = {
        body,
        icon: `https://api.dicebear.com/7.x/avataaars/svg?seed=${sender}`,
        silent: false, // 确保有声音
        tag: `msg-${sender}`, // 相同用户的消息合并
        renotify: true, // 即使是同一个 tag，也重新触发弹窗提醒
        requireInteraction: true, // 通知保持显示，直到用户点击或关闭
      }
      const n = new Notification(`来自 ${sender} 的消息`, options)

      n.onclick = () => {
        window.focus()
        selectUser(sender)
        n.close()
      }
    } catch (e) {
      console.error('Notification error:', e)
    }
  }
}

const addMessageToUser = (user: string, msg: Message) => {
  if (!allMessages.value[user]) {
    allMessages.value[user] = []
  }
  allMessages.value[user].push(msg)

  if (user === selectedUser.value) {
    nextTick(() => {
      if (messagesContainerRef.value) {
        messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
      }
    })
  }
}

const onContextMenu = (e: MouseEvent, msg: Message) => {
  e.preventDefault()
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    items: [
      {
        label: '引用回复',
        onClick: () => {
          replyingMessage.value = msg
          textareaRef.value?.focus()
        },
      },
    ],
  })
}

onClickOutside(emojiPickerRef, () => {
  showEmojiPicker.value = false
})

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
}

const syncInputOverlayScroll = () => {
  const textarea = textareaRef.value
  const overlay = inputOverlayRef.value
  if (!textarea || !overlay) return
  overlay.scrollTop = textarea.scrollTop
}

type FluentEmojiMetadata = {
  categories?: Record<string, string[]>
}

const emojiList =
  (fluentEmojiMetadata as FluentEmojiMetadata).categories?.['Smileys & Emotion'] ?? []

const hexSequenceToUnicode = (hexSequence: string) => {
  return hexSequence
    .split('-')
    .map((hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .join('')
}

const slugToUnicode = Object.entries(fluentEmojiChars as Record<string, string>).reduce(
  (acc, [hexSequence, slug]) => {
    acc[slug] = hexSequenceToUnicode(hexSequence)
    return acc
  },
  {} as Record<string, string>,
)

const unicodeToSlug = (emojiList as string[]).reduce(
  (acc, slug) => {
    const unicode = slugToUnicode[slug]
    if (unicode) acc[unicode] = slug
    return acc
  },
  {} as Record<string, string>,
)

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const emojiRegexSource = Object.keys(unicodeToSlug)
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join('|')

const emojiRegex = emojiRegexSource ? new RegExp(`(${emojiRegexSource})`, 'gu') : null

const parseMessage = (text: string) => {
  const parts: { type: 'text' | 'emoji'; content: string }[] = []
  if (!emojiRegex) return [{ type: 'text', content: text }]

  let lastIndex = 0
  let match
  while ((match = emojiRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) })
    }
    const emojiUnicode = match[0]
    const emojiName = unicodeToSlug[emojiUnicode]
    if (emojiName) parts.push({ type: 'emoji', content: emojiName })
    else parts.push({ type: 'text', content: emojiUnicode })
    lastIndex = emojiRegex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}

const addEmoji = (emojiName: string) => {
  const emojiUnicode = slugToUnicode[emojiName]
  if (!emojiUnicode) return
  messageInput.value += emojiUnicode
  showEmojiPicker.value = false
  textareaRef.value?.focus()
}

const openImagePicker = () => {
  if (!selectedUser.value) return
  imageFileInputRef.value?.click()
}

const fileToDataUrl = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('read_error'))
    reader.readAsDataURL(file)
  })
}

const handleImageSelected = async (evt: Event) => {
  const input = evt.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!selectedUser.value) return

  const image = await fileToDataUrl(file)

  const newMessage: Message = {
    sender: username.value,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: 'image',
    isMe: true,
    image,
  }

  if (replyingMessage.value) {
    newMessage.replyTo = {
      sender: replyingMessage.value.sender,
      text: replyingMessage.value.text,
      image: replyingMessage.value.image,
      type: replyingMessage.value.type,
    }
    replyingMessage.value = null
  }

  addMessageToUser(selectedUser.value, newMessage)

  if (socketRef.value?.connected) {
    const fileName =
      file.name + (newMessage.replyTo ? '|||REPLY|||' + JSON.stringify(newMessage.replyTo) : '')

    socketRef.value.emit('imageMessage', {
      sender: username.value,
      to: selectedUser.value,
      fileName,
      mimeType: file.type,
      image,
      replyTo: newMessage.replyTo,
    })
  }
}

const connectSocket = () => {
  if (socketRef.value) {
    if (!socketRef.value.connected) socketRef.value.connect()
    return
  }
  socketStatus.value = 'connecting'
  socketErrorMessage.value = ''

  const socket = io('http://192.168.0.36:3000', {
    transports: ['websocket'],
    autoConnect: false,
    auth: {
      userId: username.value,
    },
  })

  socket.on('connect', () => {
    socketStatus.value = 'connected'
  })
  socket.on('disconnect', () => {
    socketStatus.value = 'disconnected'
  })
  socket.on('connect_error', (err) => {
    socketStatus.value = 'error'
    socketErrorMessage.value = err?.message ?? 'connect_error'
  })

  socket.on('userOnline', (payload: { userId?: string; username?: string }) => {
    const name = payload.username ?? payload.userId
    if (!name || name === username.value) return
    if (!users.value.includes(name)) users.value = [name, ...users.value]
    userPresence.value = { ...userPresence.value, [name]: true }
  })
  socket.on('userOffline', (payload: { userId?: string; username?: string }) => {
    const name = payload.username ?? payload.userId
    if (!name) return
    if (!users.value.includes(name)) users.value = [name, ...users.value]
    userPresence.value = { ...userPresence.value, [name]: false }
  })

  type IncomingMessage = {
    sender?: string
    text?: string
    to?: string
    replyTo?: Message['replyTo']
  }
  socket.on('message', (payload: IncomingMessage) => {
    let text = payload.text ?? ''
    const sender = payload.sender ?? 'unknown'
    let replyTo = payload.replyTo

    if (text && text.includes('|||REPLY|||')) {
      const parts = text.split('|||REPLY|||')
      text = parts[0]!
      try {
        if (!replyTo && parts[1]) replyTo = JSON.parse(parts[1])
      } catch {
        // ignore
      }
    }

    if (sender === username.value) return

    if (!users.value.includes(sender)) {
      users.value = [sender, ...users.value]
    }

    if (sender !== selectedUser.value) {
      unreadCounts.value[sender] = (unreadCounts.value[sender] || 0) + 1
    }

    sendSystemNotification(sender, text)

    addMessageToUser(sender, {
      sender,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
      type: 'text',
      isMe: false,
      replyTo,
    })
  })

  type IncomingImageMessage = {
    sender?: string
    to?: string
    image?: string
    fileName?: string
    mimeType?: string
    replyTo?: Message['replyTo']
  }
  socket.on('imageMessage', (payload: IncomingImageMessage) => {
    const sender = payload.sender ?? 'unknown'
    const image = payload.image ?? ''
    let replyTo = payload.replyTo
    let fileName = payload.fileName ?? ''

    if (fileName && fileName.includes('|||REPLY|||')) {
      const parts = fileName.split('|||REPLY|||')
      fileName = parts[0]!
      try {
        if (!replyTo && parts[1]) replyTo = JSON.parse(parts[1])
      } catch {
        // ignore
      }
    }

    if (!image) return
    if (sender === username.value) return

    if (!users.value.includes(sender)) {
      users.value = [sender, ...users.value]
    }

    if (sender !== selectedUser.value) {
      unreadCounts.value[sender] = (unreadCounts.value[sender] || 0) + 1
    }

    sendSystemNotification(sender, '[图片]')

    addMessageToUser(sender, {
      sender,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'image',
      isMe: false,
      image,
      replyTo,
    })
  })

  type IncomingAudioMessage = {
    sender?: string
    to?: string
    audio?: string
    replyTo?: Message['replyTo']
  }
  socket.on('audioMessage', (payload: IncomingAudioMessage) => {
    const sender = payload.sender ?? 'unknown'
    const audio = payload.audio ?? ''
    const replyTo = payload.replyTo

    if (!audio) return
    if (sender === username.value) return

    if (!users.value.includes(sender)) {
      users.value = [sender, ...users.value]
    }

    if (sender !== selectedUser.value) {
      unreadCounts.value[sender] = (unreadCounts.value[sender] || 0) + 1
    }

    sendSystemNotification(sender, '[语音]')

    addMessageToUser(sender, {
      sender,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'audio',
      isMe: false,
      audio,
      replyTo,
    })
  })

  socketRef.value = socket
  socket.connect()
}

const disconnectSocket = () => {
  const socket = socketRef.value
  if (!socket) return
  socket.removeAllListeners()
  socket.disconnect()
  socketRef.value = null
  socketStatus.value = 'disconnected'
}

const users = ref<string[]>([])
const userPresence = ref<Record<string, boolean>>({})
const usersLoading = ref(false)
const usersError = ref('')

const getLastMessage = (user: string) => {
  const msgs = allMessages.value[user]
  if (!msgs || msgs.length === 0) return ''
  const last = msgs[msgs.length - 1]
  if (!last) return ''
  if (last.type === 'image') return '[图片]'
  if (last.type === 'audio') return '[语音]'
  return last.text || ''
}

const isUserOnline = (name: string) => {
  return Boolean(userPresence.value[name])
}

const displayUsers = computed(() => {
  return [...users.value].sort((a, b) => {
    const ao = isUserOnline(a)
    const bo = isUserOnline(b)
    if (ao !== bo) return ao ? -1 : 1
    return a.localeCompare(b)
  })
})

const selectedUserOnline = computed(() => {
  if (!selectedUser.value) return false
  return isUserOnline(selectedUser.value)
})

const fetchUsers = async () => {
  usersLoading.value = true
  usersError.value = ''
  try {
    const res = await fetch('http://192.168.0.36:3000/users', {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as string[]
    users.value = Array.isArray(data) ? data.filter((u) => u !== username.value) : []
    const nextPresence = { ...userPresence.value }
    for (const u of users.value) nextPresence[u] = true
    userPresence.value = nextPresence
  } catch (e: unknown) {
    usersError.value = e instanceof Error ? e.message : '加载失败'
    users.value = []
  } finally {
    usersLoading.value = false
  }
}

const backToList = () => {
  selectedUser.value = null
  messageInput.value = ''
  showEmojiPicker.value = false
}

const selectUser = (name: string) => {
  selectedUser.value = name
  if (!allMessages.value[name]) {
    allMessages.value[name] = []
  }
  unreadCounts.value[name] = 0
  messageInput.value = ''
  showEmojiPicker.value = false
}

const handleLogin = () => {
  if (inputUsername.value.trim()) {
    const name = inputUsername.value.trim()
    username.value = name
    localStorage.setItem('chat_username', name) // 保存到 localStorage
    connectSocket()
    users.value = []
    userPresence.value = {}
    selectedUser.value = null
    allMessages.value = {}
    unreadCounts.value = {}
    fetchUsers()
    requestNotificationPermission()
  }
}

const logout = () => {
  disconnectSocket()
  localStorage.removeItem('chat_username') // 清除 localStorage
  username.value = ''
  inputUsername.value = ''
  selectedUser.value = null
  users.value = []
  userPresence.value = {}
  usersError.value = ''
  usersLoading.value = false
  allMessages.value = {}
  unreadCounts.value = {}
  messageInput.value = ''
  showEmojiPicker.value = false
}

const sendMessage = () => {
  if (!selectedUser.value) return
  if (messageInput.value.trim()) {
    const text = messageInput.value.trim()
    const newMessage: Message = {
      sender: username.value,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
      type: 'text',
      isMe: true,
    }

    if (replyingMessage.value) {
      newMessage.replyTo = {
        sender: replyingMessage.value.sender,
        text: replyingMessage.value.text,
        image: replyingMessage.value.image,
        type: replyingMessage.value.type,
      }
      replyingMessage.value = null
    }

    addMessageToUser(selectedUser.value, newMessage)

    if (socketRef.value?.connected) {
      const textToSend =
        text + (newMessage.replyTo ? '|||REPLY|||' + JSON.stringify(newMessage.replyTo) : '')

      socketRef.value.emit('message', {
        sender: username.value,
        receiver: selectedUser.value,
        to: selectedUser.value,
        text: textToSend,
        replyTo: newMessage.replyTo,
      })
    }
    messageInput.value = ''
  }
}

onBeforeUnmount(() => {
  disconnectSocket()
})

onMounted(() => {
  const savedUsername = localStorage.getItem('chat_username')
  if (savedUsername) {
    inputUsername.value = savedUsername
    handleLogin()
  }
})

const currentMessages = computed(() => {
  return selectedUser.value ? allMessages.value[selectedUser.value] || [] : []
})

const previewImage = (src: string) => {
  const images = currentMessages.value
    .filter((msg) => msg.type === 'image' && msg.image)
    .map((msg) => msg.image!)

  const index = images.indexOf(src)

  viewerApi({
    images,
    options: {
      initialViewIndex: index >= 0 ? index : 0,
      toolbar: {
        zoomIn: 1,
        zoomOut: 1,
        oneToOne: 1,
        reset: 1,
        prev: 1,
        play: {
          show: 1,
          size: 'large',
        },
        next: 1,
        rotateLeft: 1,
        rotateRight: 1,
        flipHorizontal: 1,
        flipVertical: 1,
      },
    },
  })
}

const formatRecordingTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.value = new MediaRecorder(stream)
    audioChunks.value = []

    mediaRecorder.value.ondataavailable = (event) => {
      audioChunks.value.push(event.data)
    }

    mediaRecorder.value.start()
    isRecording.value = true
    recordingTime.value = 0
    recordingTimer.value = window.setInterval(() => {
      recordingTime.value++
    }, 1000)
  } catch (err) {
    console.error('Microphone access denied:', err)
    alert('无法访问麦克风，请检查权限设置。')
  }
}

const stopRecording = () => {
  if (!mediaRecorder.value || !isRecording.value) return

  mediaRecorder.value.onstop = () => {
    const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
    const reader = new FileReader()
    reader.readAsDataURL(audioBlob)
    reader.onloadend = () => {
      const base64Audio = reader.result as string
      sendAudioMessage(base64Audio)
    }
  }

  mediaRecorder.value.stop()
  mediaRecorder.value.stream.getTracks().forEach((track) => track.stop())
  if (recordingTimer.value) clearInterval(recordingTimer.value)
  isRecording.value = false
}

const cancelRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    mediaRecorder.value.stream.getTracks().forEach((track) => track.stop())
  }
  if (recordingTimer.value) clearInterval(recordingTimer.value)
  isRecording.value = false
  audioChunks.value = []
}

const sendAudioMessage = (audioData: string) => {
  if (!selectedUser.value) return

  const newMessage: Message = {
    sender: username.value,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: 'audio',
    isMe: true,
    audio: audioData,
  }

  if (replyingMessage.value) {
    newMessage.replyTo = {
      sender: replyingMessage.value.sender,
      text: replyingMessage.value.text,
      image: replyingMessage.value.image,
      type: replyingMessage.value.type,
    }
    replyingMessage.value = null
  }

  addMessageToUser(selectedUser.value, newMessage)

  if (socketRef.value?.connected) {
    socketRef.value.emit('audioMessage', {
      sender: username.value,
      to: selectedUser.value,
      audio: audioData,
      replyTo: newMessage.replyTo,
    })
  }
}
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
