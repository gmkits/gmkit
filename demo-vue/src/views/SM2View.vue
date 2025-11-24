<!--
  SM2 椭圆曲线算法视图组件
  SM2 Elliptic Curve Algorithm View Component
  
  功能：
  1. 生成密钥对 (Generate key pair)
  2. 加密/解密 (Encrypt/Decrypt)
  3. 签名/验签 (Sign/Verify)
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { generateKeyPair, sm2Encrypt, sm2Decrypt, sign, verify, getPublicKeyFromPrivateKey } from 'gmkitx'

// ========== 标签页管理 Tab Management ==========
type TabType = 'keygen' | 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'getpubkey'
const activeTab = ref<TabType>('keygen')

// ========== 密钥管理 Key Management ==========
// 私钥 Private key
const privateKey = ref('')
// 公钥 Public key
const publicKey = ref('')
// 是否压缩公钥 Whether to compress public key
const compressPublicKey = ref(false)

// 生成SM2密钥对 Generate SM2 key pair
const generateKeys = () => {
  try {
    const keyPair = generateKeyPair(compressPublicKey.value)
    privateKey.value = keyPair.privateKey
    publicKey.value = keyPair.publicKey
    showSuccess('密钥对生成成功！')
  } catch (error) {
    showError('密钥对生成失败：' + (error as Error).message)
  }
}

// 从私钥获取公钥 Get public key from private key
const derivedPublicKey = ref('')
const derivePublicKey = () => {
  if (!privateKey.value) {
    showError('请先输入私钥！')
    return
  }
  
  try {
    derivedPublicKey.value = getPublicKeyFromPrivateKey(privateKey.value, compressPublicKey.value)
    showSuccess('公钥获取成功！')
  } catch (error) {
    showError('公钥获取失败：' + (error as Error).message)
  }
}

// ========== 加密/解密 Encryption/Decryption ==========
// 加密用公钥 Public key for encryption
const encryptPublicKey = ref('')
// 明文 Plaintext
const plaintext = ref('Hello, SM2 Encryption!')
// 密文 Ciphertext
const ciphertext = ref('')

// 加密操作 Encrypt operation
const encryptText = () => {
  if (!encryptPublicKey.value) {
    showError('请输入公钥！')
    return
  }
  
  if (!plaintext.value) {
    showError('请输入明文！')
    return
  }
  
  try {
    // 使用公钥加密明文 Encrypt plaintext with public key
    const encrypted = sm2Encrypt(encryptPublicKey.value, plaintext.value)
    ciphertext.value = encrypted
    showSuccess('加密成功！')
  } catch (error) {
    showError('加密失败：' + (error as Error).message)
  }
}

// 解密用私钥 Private key for decryption
const decryptPrivateKey = ref('')
// 解密用密文 Ciphertext for decryption
const decryptCiphertext = ref('')
// 解密结果 Decryption result
const decryptedText = ref('')

// 解密操作 Decrypt operation
const decryptText = () => {
  if (!decryptPrivateKey.value) {
    showError('请输入私钥！')
    return
  }
  
  if (!decryptCiphertext.value) {
    showError('请输入密文！')
    return
  }
  
  try {
    // 使用私钥解密密文 Decrypt ciphertext with private key
    const decrypted = sm2Decrypt(decryptPrivateKey.value, decryptCiphertext.value)
    decryptedText.value = decrypted
    showSuccess('解密成功！')
  } catch (error) {
    showError('解密失败：' + (error as Error).message)
  }
}

// ========== 签名/验签 Sign/Verify ==========
// 签名用私钥 Private key for signing
const signPrivateKey = ref('')
// 待签名消息 Message to sign
const signMessage_text = ref('Hello, SM2!')
// 签名用户ID User ID for signing
const signUserId = ref('1234567812345678')
// 签名结果 Signature result
const signature = ref('')

// 签名操作 Sign operation
const signMessage = () => {
  if (!signPrivateKey.value) {
    showError('请输入私钥！')
    return
  }
  
  if (!signMessage_text.value) {
    showError('请输入待签名消息！')
    return
  }
  
  try {
    // 使用私钥对消息进行签名 Sign message with private key
    const sig = sign(signPrivateKey.value, signMessage_text.value, {
      userId: signUserId.value
    })
    signature.value = sig
    showSuccess('签名成功！')
  } catch (error) {
    showError('签名失败：' + (error as Error).message)
  }
}

// 验签用公钥 Public key for verification
const verifyPublicKey = ref('')
// 验签消息 Message for verification
const verifyMessage = ref('')
// 验签签名 Signature for verification
const verifySignature_value = ref('')
// 验签用户ID User ID for verification
const verifyUserId = ref('1234567812345678')
// 验签结果 Verification result
const verificationResult = ref('')

// 验签操作 Verify operation
const verifySignature = () => {
  if (!verifyPublicKey.value) {
    showError('请输入公钥！')
    return
  }
  
  if (!verifyMessage.value) {
    showError('请输入消息！')
    return
  }
  
  if (!verifySignature_value.value) {
    showError('请输入签名！')
    return
  }
  
  try {
    // 使用公钥验证签名 Verify signature with public key
    const isValid = verify(verifyPublicKey.value, verifyMessage.value, verifySignature_value.value, {
      userId: verifyUserId.value
    })
    
    if (isValid) {
      verificationResult.value = '✅ 签名验证成功！'
      showSuccess(verificationResult.value)
    } else {
      verificationResult.value = '❌ 签名验证失败！'
      showError(verificationResult.value)
    }
  } catch (error) {
    verificationResult.value = '❌ 验证出错：' + (error as Error).message
    showError('验证失败：' + (error as Error).message)
  }
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
  <div class="sm2-view">
    <!-- 页面标题 Page title -->
    <div class="page-header">
      <h1>🔐 SM2 椭圆曲线算法</h1>
      <p class="page-description">
        SM2 是中国国家密码管理局发布的椭圆曲线公钥密码算法，基于 256 位椭圆曲线。
        支持数字签名、密钥交换和加密等功能。
      </p>
    </div>

    <!-- 消息提示 Message notification -->
    <transition name="slide-down">
      <div v-if="showMessage" :class="['message', messageType]">
        {{ messageText }}
      </div>
    </transition>
    
    <!-- 功能标签页 Function tabs -->
    <div class="section">
      <div class="tabs">
        <button 
          :class="['tab', { active: activeTab === 'keygen' }]"
          @click="activeTab = 'keygen'"
        >
          获取密钥对
        </button>
        <button 
          :class="['tab', { active: activeTab === 'encrypt' }]"
          @click="activeTab = 'encrypt'"
        >
          加密
        </button>
        <button 
          :class="['tab', { active: activeTab === 'decrypt' }]"
          @click="activeTab = 'decrypt'"
        >
          解密
        </button>
        <button 
          :class="['tab', { active: activeTab === 'sign' }]"
          @click="activeTab = 'sign'"
        >
          签名
        </button>
        <button 
          :class="['tab', { active: activeTab === 'verify' }]"
          @click="activeTab = 'verify'"
        >
          验签
        </button>
        <button 
          :class="['tab', { active: activeTab === 'getpubkey' }]"
          @click="activeTab = 'getpubkey'"
        >
          获取公钥
        </button>
      </div>

      <!-- 标签内容 Tab content -->
      <div class="tab-content">
        <!-- 生成密钥对 Generate key pair -->
        <div v-if="activeTab === 'keygen'" class="tab-panel">
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                v-model="compressPublicKey" 
                type="checkbox" 
                class="checkbox-input"
              >
              <span class="checkbox-text">压缩公钥 (Compress Public Key)</span>
            </label>
            <p class="hint">💡 压缩公钥可以减少存储空间，但部分系统可能不支持</p>
          </div>
          
          <button class="btn btn-primary btn-block" @click="generateKeys">🎲 生成密钥对</button>
          
          <div class="form-group">
            <label for="gen-private-key">私钥 (Private Key)：</label>
            <textarea 
              id="gen-private-key"
              v-model="privateKey" 
              class="textarea" 
              placeholder="点击【生成密钥对】按钮生成"
              rows="2"
              readonly
            ></textarea>
            <p class="hint">💡 私钥用于解密和签名，请妥善保管</p>
          </div>
          
          <div class="form-group">
            <label for="gen-public-key">公钥 (Public Key)：</label>
            <textarea 
              id="gen-public-key"
              v-model="publicKey" 
              class="textarea" 
              placeholder="点击【生成密钥对】按钮生成"
              rows="3"
              readonly
            ></textarea>
            <p class="hint">💡 公钥可以公开，用于加密和验签</p>
          </div>
        </div>

        <!-- 加密 Encryption -->
        <div v-if="activeTab === 'encrypt'" class="tab-panel">
          <div class="form-group">
            <label for="enc-public-key">公钥 (Public Key)：</label>
            <textarea 
              id="enc-public-key"
              v-model="encryptPublicKey" 
              class="textarea" 
              placeholder="输入用于加密的公钥..."
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="enc-plaintext">明文 (Plaintext)：</label>
            <textarea 
              id="enc-plaintext"
              v-model="plaintext" 
              class="textarea" 
              placeholder="输入要加密的文本..."
              rows="3"
            ></textarea>
          </div>
          
          <button class="btn btn-primary btn-block" @click="encryptText">🔒 加密</button>
          
          <div class="form-group">
            <label for="enc-ciphertext">密文 (Ciphertext)：</label>
            <textarea 
              id="enc-ciphertext"
              v-model="ciphertext" 
              class="textarea" 
              placeholder="加密后的密文将显示在这里..."
              rows="4"
              readonly
            ></textarea>
            <p class="hint">💡 密文格式：04 + C1 + C3 + C2（十六进制）</p>
          </div>
        </div>

        <!-- 解密 Decryption -->
        <div v-if="activeTab === 'decrypt'" class="tab-panel">
          <div class="form-group">
            <label for="dec-private-key">私钥 (Private Key)：</label>
            <textarea 
              id="dec-private-key"
              v-model="decryptPrivateKey" 
              class="textarea" 
              placeholder="输入用于解密的私钥..."
              rows="2"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="dec-ciphertext">密文 (Ciphertext)：</label>
            <textarea 
              id="dec-ciphertext"
              v-model="decryptCiphertext" 
              class="textarea" 
              placeholder="输入要解密的密文..."
              rows="4"
            ></textarea>
          </div>
          
          <button class="btn btn-primary btn-block" @click="decryptText">🔓 解密</button>
          
          <div class="form-group">
            <label for="dec-plaintext">明文 (Plaintext)：</label>
            <textarea 
              id="dec-plaintext"
              v-model="decryptedText" 
              class="textarea" 
              placeholder="解密后的明文将显示在这里..."
              rows="3"
              readonly
            ></textarea>
          </div>
        </div>

        <!-- 签名 Sign -->
        <div v-if="activeTab === 'sign'" class="tab-panel">
          <div class="form-group">
            <label for="sign-private-key">私钥 (Private Key)：</label>
            <textarea 
              id="sign-private-key"
              v-model="signPrivateKey" 
              class="textarea" 
              placeholder="输入用于签名的私钥..."
              rows="2"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="sign-message">消息 (Message)：</label>
            <textarea 
              id="sign-message"
              v-model="signMessage_text" 
              class="textarea" 
              placeholder="输入要签名的消息..."
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="sign-userid">用户ID (User ID)：</label>
            <input 
              id="sign-userid"
              v-model="signUserId" 
              type="text" 
              class="input" 
              placeholder="输入用户ID（默认：1234567812345678）"
            >
            <p class="hint">💡 用于签名时的 Z 值计算</p>
          </div>
          
          <button class="btn btn-primary btn-block" @click="signMessage">✍️ 签名</button>
          
          <div class="form-group">
            <label for="sign-signature">签名 (Signature)：</label>
            <textarea 
              id="sign-signature"
              v-model="signature" 
              class="textarea" 
              placeholder="签名结果将显示在这里..."
              rows="3"
              readonly
            ></textarea>
            <p class="hint">💡 签名格式：r + s（十六进制，各32字节）</p>
          </div>
        </div>

        <!-- 验签 Verify -->
        <div v-if="activeTab === 'verify'" class="tab-panel">
          <div class="form-group">
            <label for="verify-public-key">公钥 (Public Key)：</label>
            <textarea 
              id="verify-public-key"
              v-model="verifyPublicKey" 
              class="textarea" 
              placeholder="输入用于验签的公钥..."
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="verify-message">消息 (Message)：</label>
            <textarea 
              id="verify-message"
              v-model="verifyMessage" 
              class="textarea" 
              placeholder="输入要验证的消息..."
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="verify-signature">签名 (Signature)：</label>
            <textarea 
              id="verify-signature"
              v-model="verifySignature_value" 
              class="textarea" 
              placeholder="输入签名值..."
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="verify-userid">用户ID (User ID)：</label>
            <input 
              id="verify-userid"
              v-model="verifyUserId" 
              type="text" 
              class="input" 
              placeholder="输入用户ID（默认：1234567812345678）"
            >
            <p class="hint">💡 用于验签时的 Z 值计算，必须与签名时一致</p>
          </div>
          
          <button class="btn btn-primary btn-block" @click="verifySignature">✅ 验签</button>
          
          <div v-if="verificationResult" class="form-group">
            <label>验证结果 (Verification Result)：</label>
            <div :class="['result-box', verificationResult.includes('成功') ? 'success' : 'error']">
              {{ verificationResult }}
            </div>
          </div>
        </div>

        <!-- 获取公钥 Get public key -->
        <div v-if="activeTab === 'getpubkey'" class="tab-panel">
          <div class="form-group">
            <label for="derive-private-key">私钥 (Private Key)：</label>
            <textarea 
              id="derive-private-key"
              v-model="privateKey" 
              class="textarea" 
              placeholder="输入私钥..."
              rows="2"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                v-model="compressPublicKey" 
                type="checkbox" 
                class="checkbox-input"
              >
              <span class="checkbox-text">压缩公钥 (Compress Public Key)</span>
            </label>
          </div>
          
          <button class="btn btn-primary btn-block" @click="derivePublicKey">🔑 获取公钥</button>
          
          <div class="form-group">
            <label for="derived-public-key">公钥 (Public Key)：</label>
            <textarea 
              id="derived-public-key"
              v-model="derivedPublicKey" 
              class="textarea" 
              placeholder="公钥将显示在这里..."
              rows="3"
              readonly
            ></textarea>
            <p class="hint">💡 从私钥导出的公钥</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 视图容器 View container */
.sm2-view {
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

/* 次按钮 Secondary button */
.btn-secondary {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  color: #333;
}

.btn-secondary:hover {
  background: linear-gradient(135deg, #e8e8e8 0%, #d8d8d8 100%);
}

/* 按钮组样式 Button group styles */
.button-group {
  display: flex;
  gap: 15px;
  margin: 20px 0;
  flex-wrap: wrap;
}

/* 标签页样式 Tabs styles */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 25px;
  border-bottom: 2px solid #e8e8e8;
  overflow-x: auto;
  scrollbar-width: thin;
}

.tabs::-webkit-scrollbar {
  height: 4px;
}

.tabs::-webkit-scrollbar-thumb {
  background: #667eea;
  border-radius: 2px;
}

.tab {
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
  white-space: nowrap;
  position: relative;
}

.tab:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.tab.active {
  color: #667eea;
  font-weight: 600;
  border-bottom-color: #667eea;
}

/* 标签内容 Tab content */
.tab-content {
  padding: 20px 0;
}

.tab-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 全宽按钮 Full-width button */
.btn-block {
  width: 100%;
  margin: 20px 0;
}

/* 复选框样式 Checkbox styles */
.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 10px 0;
}

.checkbox-input {
  margin-right: 10px;
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.checkbox-text {
  color: #333;
  font-size: 0.95em;
  font-weight: 500;
}

/* 结果框 Result box */
.result-box {
  padding: 15px 20px;
  border-radius: 10px;
  font-weight: 600;
  text-align: center;
  margin-top: 10px;
}

.result-box.success {
  background: #d4edda;
  color: #155724;
  border: 2px solid #c3e6cb;
}

.result-box.error {
  background: #f8d7da;
  color: #721c24;
  border: 2px solid #f5c6cb;
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

  .button-group {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
  
  .tabs {
    gap: 4px;
  }
  
  .tab {
    padding: 10px 16px;
    font-size: 13px;
  }
}
</style>
