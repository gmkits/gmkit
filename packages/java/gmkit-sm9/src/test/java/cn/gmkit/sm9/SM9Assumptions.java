package cn.gmkit.sm9;

import org.junit.jupiter.api.condition.EnabledIf;

/**
 * 测试条件辅助：仅当当前平台存在可用的 SM9 native 库时才执行相关测试。
 * <p>
 * 在未编译 / 未提供 native 库的环境（如未安装 GmSSL 的普通 CI），相关测试将被
 * {@link EnabledIf} 优雅跳过，而不会失败。
 */
final class SM9Assumptions {

    static final String REQUIRE_NATIVE_PROPERTY = "gmkit.sm9.requireNative";

    private SM9Assumptions() {
    }

    /**
     * 供 {@code @EnabledIf} 引用的判定方法。
     *
     * @return native 库可用返回 {@code true}
     */
    static boolean nativeAvailable() {
        // 专用 native job 设置该属性后，即使库加载失败也必须让测试进入正文并失败，
        // 不能让 @EnabledIf 把缺失 runtime 伪装成 skipped。
        return SM9.isAvailable() || Boolean.getBoolean(REQUIRE_NATIVE_PROPERTY);
    }

    /** 资源 fixture 只依赖支持的平台命名，不依赖本机是否安装 native。 */
    static boolean platformSupportedOrNativeRequired() {
        if (Boolean.getBoolean(REQUIRE_NATIVE_PROPERTY)) return true;
        try {
            SM9NativeLoader.detectPlatform();
            return true;
        } catch (SM9UnsupportedPlatformException unsupported) {
            return false;
        }
    }
}
