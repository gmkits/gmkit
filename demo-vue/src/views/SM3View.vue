<!--
  SM3 哈希算法视图组件
  SM3 Hash Algorithm View Component
  
  功能：
  1. 计算SM3哈希 (Calculate SM3 hash)
  2. 计算HMAC (Calculate HMAC)
-->
<script setup lang="ts">
import { ref } from 'vue'
import { digest, hmac } from 'gmkitx'

// ========== SM3 哈希计算 SM3 Hash Calculation ==========
// 输入文本 Input text
const inputText = ref('Hello, SM3!')
// 哈希结果 Hash result
const hashResult = ref('')

// 计算SM3哈希 Calculate SM3 hash
const calculateHash = () => {
  if (!inputText.value) {
    showError('请输入要计算哈希的文本！')
    return
  }
  
  try {
    // 使用SM3算法计算哈希值 Calculate hash using SM3 algorithm
    const hash = digest(inputText.value)
    hashResult.value = hash
    showSuccess('哈希计算成功！')
  } catch (error) {
    showError('哈希计算失败：' + (error as Error).message)
  }
}

// ========== HMAC 计算 HMAC Calculation ==========
// HMAC密钥 HMAC key
const hmacKey = ref('secret-key')
// HMAC消息 HMAC message
const hmacMessage = ref('data to authenticate')
// HMAC结果 HMAC result
const hmacResult = ref('')

// 计算HMAC Calculate HMAC
const calculateHMAC = () => {
  if (!hmacKey.value) {
    showError('请输入HMAC密钥！')
    return
  }
  
  if (!hmacMessage.value) {
    showError('请输入HMAC消息！')
    return
  }
  
  try {
    // 使用SM3算法计算HMAC (基于密钥的消息认证码)
    // Calculate HMAC using SM3 algorithm (Hash-based Message Authentication Code)
    const mac = hmac(hmacKey.value, hmacMessage.value)
    hmacResult.value = mac
    showSuccess('HMAC计算成功！')
  } catch (error) {
    showError('HMAC计算失败：' + (error as Error).message)
  }
}

// ========== 文件哈希计算 File Hash Calculation ==========
// 文件哈希结果 File hash result
const fileHashResult = ref('')
// 文件名 File name
const fileName = ref('')

// 处理文件选择 Handle file selection
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) {
    return
  }
  
  fileName.value = file.name
  
  // 读取文件并计算哈希 Read file and calculate hash
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      // 计算文件内容的哈希 Calculate hash of file content
      const hash = digest(content)
      fileHashResult.value = hash
      showSuccess(`文件 "${file.name}" 的哈希计算成功！`)
    } catch (error) {
      showError('文件哈希计算失败：' + (error as Error).message)
    }
  }
  
  reader.onerror = () => {
    showError('文件读取失败！')
  }
  
  reader.readAsText(file)
}

// ========== 消息提示 Message notifications ==========
const messageText = ref('')
const messageType = ref<'success' | 'error'>('success')
const showMessage = ref(false)

// 显示成功消息 Show success message
const showSuccess = (msg: string) => {
  messageText.value = msg
  messageType.value = 'success'
  showMessage.value = true
  setTimeout(() => {
    showMessage.value = false
  }, 3000)
}

// 显示错误消息 Show error message
const showError = (msg: string) => {
  messageText.value = msg
  messageType.value = 'error'
  showMessage.value = true
  setTimeout(() => {
    showMessage.value = false
  }, 3000)
}
</script>

<template>
  <div class="sm3-view">
    <!-- 页面标题 Page title -->
    <div class="page-header">
      <h1>🔒 SM3 哈希算法</h1>
      <p class="page-description">
        SM3 是中国国家密码管理局发布的密码哈希算法，输出 256 位（32 字节）哈希值。
        用于数字签名和验证、消息认证码生成及验证、随机数生成等。
      </p>
    </div>

    <!-- 消息提示 Message notification -->
    <transition name="slide-down">
      <div v-if="showMessage" :class="['message', messageType]">
        {{ messageText }}
      </div>
    </transition>

    <!-- 哈希计算区域 Hash calculation section -->
    <div class="section">
      <h2 class="section-title">🔐 哈希计算</h2>
      <div class="section-content">
        <!-- 输入文本 Input text -->
        <div class="form-group">
          <label for="input-text">输入文本：</label>
          <textarea 
            id="input-text"
            v-model="inputText" 
            class="textarea" 
            placeholder="输入要计算哈希的文本..."
            rows="5"
          ></textarea>
        </div>
        
        <!-- 计算按钮 Calculate button -->
        <button class="btn btn-primary" @click="calculateHash">🔒 计算 SM3 哈希</button>
        
        <!-- 哈希结果 Hash result -->
        <div class="form-group">
          <label for="hash-result">哈希值 (Hash)：</label>
          <input 
            id="hash-result"
            v-model="hashResult" 
            type="text" 
            class="input result-field" 
            placeholder="哈希结果将显示在这里..."
            readonly
          >
          <p class="hint">💡 输出256位（64个十六进制字符）的哈希值</p>
        </div>
      </div>
    </div>

    <!-- HMAC计算区域 HMAC calculation section -->
    <div class="section">
      <h2 class="section-title">🔑 HMAC 计算</h2>
      <div class="section-content">
        <p class="section-description">
          HMAC（Hash-based Message Authentication Code）是一种基于哈希的消息认证码，
          用于验证消息的完整性和真实性。
        </p>
        
        <!-- HMAC密钥 HMAC key -->
        <div class="form-group">
          <label for="hmac-key">密钥 (Key)：</label>
          <input 
            id="hmac-key"
            v-model="hmacKey" 
            type="text" 
            class="input" 
            placeholder="输入HMAC密钥..."
          >
          <p class="hint">💡 密钥应保密，用于生成和验证HMAC</p>
        </div>
        
        <!-- HMAC消息 HMAC message -->
        <div class="form-group">
          <label for="hmac-message">消息 (Message)：</label>
          <textarea 
            id="hmac-message"
            v-model="hmacMessage" 
            class="textarea" 
            placeholder="输入要认证的消息..."
            rows="4"
          ></textarea>
        </div>
        
        <!-- 计算按钮 Calculate button -->
        <button class="btn btn-primary" @click="calculateHMAC">🔑 计算 HMAC</button>
        
        <!-- HMAC结果 HMAC result -->
        <div class="form-group">
          <label for="hmac-result">HMAC 值：</label>
          <input 
            id="hmac-result"
            v-model="hmacResult" 
            type="text" 
            class="input result-field" 
            placeholder="HMAC结果将显示在这里..."
            readonly
          >
          <p class="hint">💡 HMAC结合了密钥和消息，提供数据完整性和身份验证</p>
        </div>
      </div>
    </div>

    <!-- 文件哈希计算区域 File hash calculation section -->
    <div class="section">
      <h2 class="section-title">📄 文件哈希计算</h2>
      <div class="section-content">
        <p class="section-description">
          上传文件以计算其SM3哈希值，可用于文件完整性验证。
        </p>
        
        <!-- 文件选择 File selection -->
        <div class="form-group">
          <label for="file-input" class="file-label">
            <span class="file-icon">📁</span>
            <span>选择文件</span>
          </label>
          <input 
            id="file-input"
            type="file" 
            class="file-input"
            @change="handleFileChange"
          >
          <p v-if="fileName" class="file-name">已选择：{{ fileName }}</p>
        </div>
        
        <!-- 文件哈希结果 File hash result -->
        <div v-if="fileHashResult" class="form-group">
          <label for="file-hash-result">文件哈希值：</label>
          <input 
            id="file-hash-result"
            v-model="fileHashResult" 
            type="text" 
            class="input result-field" 
            placeholder="文件哈希结果将显示在这里..."
            readonly
          >
          <p class="hint">💡 可以将此哈希值与原始哈希值对比，验证文件是否被篡改</p>
        </div>
      </div>
    </div>

    <!-- 算法说明区域 Algorithm description section -->
    <div class="section info-section">
      <h2 class="section-title">ℹ️ 算法说明</h2>
      <div class="section-content">
        <div class="info-grid">
          <div class="info-item">
            <h3>🔹 算法特点</h3>
            <ul>
              <li>输出长度：256 位（32 字节）</li>
              <li>消息分组长度：512 位（64 字节）</li>
              <li>迭代次数：64 轮</li>
              <li>安全性：抗碰撞、抗原像攻击</li>
            </ul>
          </div>
          
          <div class="info-item">
            <h3>🔹 应用场景</h3>
            <ul>
              <li>数字签名和验证</li>
              <li>消息认证码（HMAC）</li>
              <li>密钥派生函数（KDF）</li>
              <li>文件完整性校验</li>
            </ul>
          </div>
          
          <div class="info-item">
            <h3>🔹 标准规范</h3>
            <ul>
              <li>国家标准：GM/T 0004-2012</li>
              <li>发布机构：国家密码管理局</li>
              <li>设计基础：SHA-256 改进</li>
              <li>应用领域：金融、政务、商务</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 视图容器 View container */
.sm3-view {
  max-width: 1000px;
  margin: 0 auto;
}

/* 页面标题样式 Page header styles */
.page-header {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  padding: 35px;
  border-radius: 16px;
  margin-bottom: 30px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.12);
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.page-header h1 {
  font-size: 2.2em;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 15px;
  font-weight: 700;
}

.page-description {
  color: #555;
  line-height: 1.8;
  font-size: 1.05em;
}

/* 消息提示样式 Message notification styles */
.message {
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* 消息进入/离开动画 Message enter/leave animation */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 区块样式 Section styles */
.section {
  background: white;
  padding: 35px;
  border-radius: 16px;
  margin-bottom: 30px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.section:hover {
  box-shadow: 0 8px 28px rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.2);
}

.section-title {
  font-size: 1.6em;
  color: #333;
  margin-bottom: 25px;
  padding-bottom: 18px;
  border-bottom: 3px solid transparent;
  border-image: linear-gradient(90deg, #667eea, #764ba2) 1;
  font-weight: 600;
}

.section-content {
  padding-top: 10px;
}

.section-description {
  color: #666;
  line-height: 1.7;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

/* 表单组样式 Form group styles */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 0.95em;
}

/* 输入框样式 Input styles */
.input {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
  background: #fafafa;
  color: #333;
}

.input:hover {
  border-color: #d0d0d0;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.result-field {
  background: #f8f9fa;
  font-weight: 600;
  color: #667eea;
}

/* 文本域样式 Textarea styles */
.textarea {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  resize: vertical;
  transition: all 0.3s ease;
  background: #fafafa;
  color: #333;
  line-height: 1.6;
}

.textarea:hover {
  border-color: #d0d0d0;
}

.textarea:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

/* 文件输入样式 File input styles */
.file-input {
  display: none;
}

.file-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-label:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.file-icon {
  font-size: 1.3em;
}

.file-name {
  margin-top: 10px;
  color: #666;
  font-size: 0.9em;
  font-style: italic;
}

/* 提示文本样式 Hint text styles */
.hint {
  margin-top: 8px;
  font-size: 0.88em;
  color: #666;
  line-height: 1.6;
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #ffd93d;
}

/* 按钮样式 Button styles */
.btn {
  padding: 14px 32px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn:hover::before {
  width: 300px;
  height: 300px;
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: translateY(-1px);
}

/* 主按钮 Primary button */
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
}

/* 信息区块样式 Info section styles */
.info-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.info-item {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.info-item h3 {
  color: #667eea;
  font-size: 1.1em;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

.info-item ul {
  list-style: none;
  padding: 0;
}

.info-item li {
  padding: 8px 0;
  color: #555;
  line-height: 1.6;
  position: relative;
  padding-left: 20px;
}

.info-item li::before {
  content: '•';
  position: absolute;
  left: 5px;
  color: #667eea;
  font-weight: bold;
}

/* 响应式设计 Responsive design */
@media (max-width: 768px) {
  .page-header {
    padding: 20px;
  }

  .page-header h1 {
    font-size: 1.6em;
  }

  .section {
    padding: 20px;
  }

  .section-title {
    font-size: 1.3em;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
