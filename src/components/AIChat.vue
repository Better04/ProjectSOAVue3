<script setup>
import { ref, nextTick } from 'vue';
import axios from 'axios';

const isOpen = ref(false);
const loading = ref(false);
const inputMsg = ref('');
const selectedImage = ref(null); // 存储 Base64 图片
const fileInput = ref(null);     // 文件输入框引用
const messagesContainer = ref(null);

const messages = ref([
  { role: 'ai', content: '你好！我是你的 AI 助手，支持发送图片哦！' }
]);

const toggleChat = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) scrollToBottom();
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 触发文件选择
const triggerFileUpload = () => {
  fileInput.value.click();
};

// 处理文件选择 -> 转 Base64
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage.value = e.target.result; // 获取 data:image/png;base64,...
  };
  reader.readAsDataURL(file);
  
  // 清空 input 防止重复选择同一文件不触发 change
  event.target.value = '';
};

// 清除已选图片
const clearImage = () => {
  selectedImage.value = null;
};

const sendMessage = async () => {
  if ((!inputMsg.value.trim() && !selectedImage.value) || loading.value) return;

  const userText = inputMsg.value;
  const userImg = selectedImage.value;

  // 1. 添加用户消息到 UI (如果包含图片，显示图片)
  messages.value.push({ 
    role: 'user', 
    content: userText, 
    image: userImg 
  });

  // 清空输入
  inputMsg.value = '';
  selectedImage.value = null;
  loading.value = true;
  await scrollToBottom();

  try {
    // 2. 发送请求
    const res = await axios.post('/api/chat/send', { 
      message: userText,
      image: userImg // 发送 Base64 图片
    });
    
    const aiReply = res.data.reply || "我暂时无法回答这个问题。";
    messages.value.push({ role: 'ai', content: aiReply });

  } catch (error) {
    console.error(error);
    messages.value.push({ role: 'ai', content: '发送失败，请检查网络或模型是否支持图片。' });
  } finally {
    loading.value = false;
    await scrollToBottom();
  }
};
</script>

<template>
  <div class="ai-chat-widget">
    <v-card v-if="isOpen" class="chat-window rounded-xl" elevation="10" width="350" height="550">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 pl-4">AI小助手</v-toolbar-title>
        <v-btn icon="mdi-close" variant="text" size="small" @click="toggleChat"></v-btn>
      </v-toolbar>

      <div class="chat-messages pa-3" ref="messagesContainer">
        <div v-for="(msg, index) in messages" :key="index" class="d-flex mb-3"
             :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          <div class="msg-container d-flex flex-column" 
               :class="msg.role === 'user' ? 'align-end' : 'align-start'" style="max-width: 85%;">
            
            <v-img v-if="msg.image" :src="msg.image" width="150" class="rounded-lg mb-1 border"></v-img>
            
            <div v-if="msg.content" 
                 class="msg-bubble rounded-lg px-3 py-2 text-body-2"
                 :class="msg.role === 'user' ? 'bg-primary text-white' : 'bg-grey-lighten-3 text-grey-darken-3'">
              {{ msg.content }}
            </div>
          </div>
        </div>
        
        <div v-if="loading" class="d-flex justify-start mb-2">
           <v-chip size="small" color="primary" variant="tonal">ε=(´ο｀*)加速理解ing ...</v-chip>
        </div>
      </div>

      <div class="chat-input-area bg-grey-lighten-4 pa-2">
        <div v-if="selectedImage" class="image-preview d-flex align-center px-2 py-1 mb-2 bg-white rounded border">
          <v-img :src="selectedImage" height="40" width="40" cover class="rounded mr-2"></v-img>
          <span class="text-caption text-truncate flex-grow-1">已选择图片</span>
          <v-btn icon="mdi-close-circle" size="x-small" variant="text" color="grey" @click="clearImage"></v-btn>
        </div>

        <div class="d-flex align-center gap-1">
          <input type="file" ref="fileInput" accept="image/*" style="display: none" @change="handleFileChange" />
          
          <v-btn icon="mdi-paperclip" size="small" variant="text" color="grey-darken-1" @click="triggerFileUpload"></v-btn>

          <v-text-field
            v-model="inputMsg"
            :placeholder="selectedImage ? '添加描述...' : '输入消息...'"
            variant="solo"
            density="compact"
            hide-details
            rounded="lg"
            @keydown.enter="sendMessage"
            :disabled="loading"
          >
            <template v-slot:append-inner>
               <v-icon icon="mdi-send" color="primary" class="cursor-pointer" @click="sendMessage"></v-icon>
            </template>
          </v-text-field>
        </div>
      </div>
    </v-card>

    <v-btn class="chat-fab" icon="mdi-message-image-outline" color="primary" size="x-large" elevation="8" 
           @click="toggleChat" :class="{ 'fab-active': isOpen }"></v-btn>
  </div>
</template>

<style scoped>
.ai-chat-widget {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.chat-window {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  background-color: white;
}
.chat-input-area {
  border-top: 1px solid #e0e0e0;
}
.msg-bubble {
  word-wrap: break-word;
  line-height: 1.5;
}
.chat-fab {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}
.fab-active {
  transform: rotate(90deg);
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>