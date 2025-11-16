<!--
  应用主布局组件 - 左右结构
  Application Main Layout Component - Left-Right Structure

  左侧：导航菜单，显示所有可用的算法工具
  Right side: Content area for displaying the selected tool interface
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// 当前路由实例 Current router instance
const router = useRouter()
const route = useRoute()

// 菜单项定义 Menu item definition
interface MenuItem {
  id: string
  name: string
  icon: string
  description: string
  route: string
}

// 导航菜单配置 Navigation menu configuration
const menuItems = ref<MenuItem[]>([
  {
    id: 'sm2',
    name: 'SM2 椭圆曲线算法',
    icon: '🔐',
    description: '公钥密码算法，用于加密、签名和密钥交换',
    route: '/sm2'
  },
  {
    id: 'sm3',
    name: 'SM3 哈希算法',
    icon: '🔒',
    description: '密码杂凑算法，生成消息摘要',
    route: '/sm3'
  },
  {
    id: 'sm4',
    name: 'SM4 分组密码',
    icon: '🛡️',
    description: '对称加密算法，用于数据加密',
    route: '/sm4'
  }
])

// 计算当前激活的菜单项 Compute currently active menu item
const activeMenuId = computed(() => {
  const path = route.path
  const item = menuItems.value.find(item => item.route === path)
  return item?.id || ''
})

// 导航到指定路由 Navigate to specified route
const navigateTo = (route: string) => {
  router.push(route)
}

// 返回首页 Return to home page
const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="app-layout">
    <!-- 左侧导航栏 Left sidebar navigation -->
    <aside class="sidebar">
      <!-- 顶部标题区域 Top title area -->
      <div class="sidebar-header" @click="goHome">
        <h1 class="logo">🔐 SMKit</h1>
        <p class="tagline">信创国密算法工具集</p>
      </div>

      <!-- 导航菜单列表 Navigation menu list -->
      <nav class="nav-menu">
        <div
          v-for="item in menuItems"
          :key="item.id"
          :class="['menu-item', { active: activeMenuId === item.id }]"
          @click="navigateTo(item.route)"
        >
          <div class="menu-item-icon">{{ item.icon }}</div>
          <div class="menu-item-content">
            <div class="menu-item-name">{{ item.name }}</div>
            <div class="menu-item-desc">{{ item.description }}</div>
          </div>
        </div>
      </nav>

      <!-- 底部信息 Footer information -->
      <div class="sidebar-footer">
        <p>
          <a href="https://github.com/CherryRum/smkit" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
        <p class="copyright">Apache 2.0 License</p>
      </div>
    </aside>

    <!-- 右侧内容区域 Right content area -->
    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
/* 整体布局样式 Overall layout styles */
.app-layout {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 左侧边栏样式 Left sidebar styles */
.sidebar {
  width: 320px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 侧边栏顶部标题 Sidebar header */
.sidebar-header {
  padding: 30px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: background 0.3s;
}

.sidebar-header:hover {
  background: rgba(102, 126, 234, 0.05);
}

.logo {
  font-size: 1.8em;
  color: #667eea;
  margin-bottom: 8px;
  font-weight: 700;
}

.tagline {
  color: #666;
  font-size: 0.9em;
  line-height: 1.5;
}

/* 导航菜单样式 Navigation menu styles */
.nav-menu {
  flex: 1;
  padding: 20px 0;
}

/* 菜单项样式 Menu item styles */
.menu-item {
  display: flex;
  align-items: flex-start;
  padding: 18px 20px;
  margin: 8px 15px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.menu-item:hover {
  background: rgba(102, 126, 234, 0.08);
  transform: translateX(5px);
}

.menu-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  border-color: transparent;
}

.menu-item.active .menu-item-icon,
.menu-item.active .menu-item-name,
.menu-item.active .menu-item-desc {
  color: white;
}

.menu-item-icon {
  font-size: 2em;
  margin-right: 15px;
  flex-shrink: 0;
}

.menu-item-content {
  flex: 1;
}

.menu-item-name {
  font-size: 1.1em;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.menu-item-desc {
  font-size: 0.85em;
  color: #666;
  line-height: 1.4;
}

/* 侧边栏底部 Sidebar footer */
.sidebar-footer {
  padding: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  text-align: center;
  font-size: 0.85em;
  color: #666;
}

.sidebar-footer a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.3s;
}

.sidebar-footer a:hover {
  opacity: 0.7;
}

.copyright {
  margin-top: 5px;
  font-size: 0.9em;
  opacity: 0.7;
}

/* 右侧内容区域样式 Right content area styles */
.content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

/* 页面切换动画 Page transition animation */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 响应式布局 Responsive layout */
@media (max-width: 968px) {
  .app-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    max-height: none;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-menu {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    padding: 10px;
    scrollbar-width: thin;
  }

  .nav-menu::-webkit-scrollbar {
    height: 6px;
  }

  .nav-menu::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 3px;
  }

  .menu-item {
    min-width: 220px;
    margin: 0 8px;
    flex-shrink: 0;
  }

  .menu-item:hover {
    transform: translateY(-3px);
  }

  .menu-item:first-child {
    margin-left: 10px;
  }

  .menu-item:last-child {
    margin-right: 10px;
  }

  .content {
    padding: 20px;
    min-height: calc(100vh - 200px);
  }
}

@media (max-width: 640px) {
  .sidebar-header {
    padding: 15px;
  }

  .logo {
    font-size: 1.3em;
  }

  .tagline {
    font-size: 0.8em;
  }

  .menu-item {
    padding: 12px;
    min-width: 180px;
  }

  .menu-item-icon {
    font-size: 1.5em;
  }

  .menu-item-name {
    font-size: 0.95em;
  }

  .menu-item-desc {
    font-size: 0.75em;
  }

  .content {
    padding: 15px;
  }
}
</style>
