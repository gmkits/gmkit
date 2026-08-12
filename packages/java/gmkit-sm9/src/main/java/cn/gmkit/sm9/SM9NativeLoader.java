package cn.gmkit.sm9;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * SM9 native 库加载器，负责按操作系统 / CPU 架构定位并加载 GmSSL JNI 桥接库。
 *
 * <h2>加载顺序</h2>
 * <ol>
 *     <li>系统属性 {@code -Dgmkit.sm9.native.path=/abs/path/to/libgmkitsm9.so}：直接加载指定文件，
 *     并尝试从同目录预加载 {@code gmssl} 依赖库；</li>
 *     <li>{@code System.loadLibrary("gmkitsm9")}：从 {@code java.library.path} 或系统库路径加载；</li>
 *     <li>JAR 内置：从 classpath {@code native/{platform}/} 解压 {@code gmssl} 依赖库与桥接库到临时目录后加载。</li>
 * </ol>
 *
 * <h2>平台标识</h2>
 * {@code linux-x86_64}、{@code linux-aarch64}、{@code darwin-x86_64}、{@code darwin-aarch64}、
 * {@code windows-x86_64}。
 *
 * <h2>依赖链</h2>
 * 桥接库 {@code gmkitsm9} 依赖 GmSSL 的 {@code gmssl} 动态库，因此必须先加载 {@code gmssl}：
 * <ul>
 *     <li>Linux：{@code libgmssl.so.3} → {@code libgmkitsm9.so}</li>
 *     <li>macOS：{@code libgmssl.3.dylib} → {@code libgmkitsm9.dylib}</li>
 *     <li>Windows：{@code gmssl.dll} → {@code gmkitsm9.dll}</li>
 * </ul>
 */
final class SM9NativeLoader {

    /**
     * 指定桥接库绝对路径的系统属性名。
     */
    static final String NATIVE_PATH_PROPERTY = "gmkit.sm9.native.path";

    /**
     * 桥接库基础名（不含平台前后缀）。
     */
    static final String BRIDGE_LIB_NAME = "gmkitsm9";

    private static final String RESOURCE_ROOT = "native";

    private static final String HASH_MANIFEST = "META-INF/gmkit/sm9-native.sha256";

    private static boolean loaded;

    private SM9NativeLoader() {
    }

    /**
     * 加载 SM9 native 库；该方法幂等，重复调用只会加载一次。
     *
     * @throws SM9UnsupportedPlatformException 当前平台不支持或无可用 native 库
     * @throws SM9Exception                    加载过程中发生 IO 或链接错误
     */
    static synchronized void load() {
        if (loaded) {
            return;
        }

        // 1. 显式指定的绝对路径。
        String explicit = System.getProperty(NATIVE_PATH_PROPERTY);
        if (explicit != null && !explicit.trim().isEmpty()) {
            loadFromExplicitPath(explicit.trim());
            loaded = true;
            return;
        }

        // 2. 系统已安装（java.library.path）。
        Throwable systemLoadError;
        try {
            System.loadLibrary(BRIDGE_LIB_NAME);
            loaded = true;
            return;
        } catch (UnsatisfiedLinkError | SecurityException ex) {
            systemLoadError = ex;
            // 回退到 JAR 内置资源。
        }

        // 3. JAR 内置资源。
        try {
            loadFromResources();
        } catch (SM9Exception ex) {
            ex.addSuppressed(systemLoadError);
            throw ex;
        }
        loaded = true;
    }

    private static void loadFromExplicitPath(String path) {
        final Path bridge;
        try {
            bridge = java.nio.file.Paths.get(path);
        } catch (RuntimeException ex) {
            throw new SM9Exception(SM9Messages.nativeUnavailable(ex), ex);
        }
        Path dir = bridge.toAbsolutePath().getParent();
        Throwable dependencyError = null;
        if (dir != null) {
            // 显式路径允许依赖已经由系统提供；若同目录文件存在则优先尝试加载。
            dependencyError = tryLoadFromFile(dir.resolve(dependencyLibFileName()));
        }
        try {
            System.load(bridge.toAbsolutePath().toString());
        } catch (UnsatisfiedLinkError | SecurityException ex) {
            SM9Exception failure = new SM9Exception(SM9Messages.nativeUnavailable(ex), ex);
            addSuppressed(failure, dependencyError);
            throw failure;
        }
    }

    private static void loadFromResources() {
        String platform = detectPlatform();
        Path tempDir;
        try {
            tempDir = Files.createTempDirectory("gmkit-sm9-");
        } catch (IOException e) {
            throw new SM9Exception(SM9Messages.nativeUnavailable(e), e);
        }
        tempDir.toFile().deleteOnExit();

        // 先解压并预加载 gmssl 依赖库（若资源存在）。
        String dependency = dependencyLibFileName();
        Map<String, String> hashes = loadHashManifest();
        Path dependencyFile = extractIfPresent(platform, dependency, tempDir, hashes);
        if (dependencyFile != null) {
            Throwable dependencyError = tryLoadFromFile(dependencyFile);
            if (dependencyError != null) {
                throw new SM9Exception(SM9Messages.nativeUnavailable(dependencyError), dependencyError);
            }
        }

        // 再解压并加载桥接库。
        String bridge = bridgeLibFileName();
        Path bridgeFile = extractIfPresent(platform, bridge, tempDir, hashes);
        if (bridgeFile == null) {
            throw new SM9UnsupportedPlatformException(
                    SM9Messages.nativeUnavailable(new IllegalStateException(
                            "缺少 native 资源 / missing native resource: "
                                    + RESOURCE_ROOT + "/" + platform + "/" + bridge)));
        }
        try {
            System.load(bridgeFile.toAbsolutePath().toString());
        } catch (UnsatisfiedLinkError | SecurityException ex) {
            throw new SM9Exception(SM9Messages.nativeUnavailable(ex), ex);
        }
    }

    private static Path extractIfPresent(
            String platform, String fileName, Path targetDir, Map<String, String> hashes) {
        String resource = RESOURCE_ROOT + "/" + platform + "/" + fileName;
        ClassLoader loader = SM9NativeLoader.class.getClassLoader();
        try (InputStream in = loader.getResourceAsStream(resource)) {
            if (in == null) {
                return null;
            }
            Path target = targetDir.resolve(fileName);
            try (OutputStream out = Files.newOutputStream(target)) {
                copy(in, out);
            }
            verifyResourceHash(resource, target, hashes);
            target.toFile().deleteOnExit();
            return target;
        } catch (IOException e) {
            throw new SM9Exception(SM9Messages.nativeUnavailable(e), e);
        }
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        // 使用固定缓冲区复制，兼容 JDK 8。
        byte[] buffer = new byte[8192];
        int read;
        while ((read = in.read(buffer)) != -1) {
            out.write(buffer, 0, read);
        }
        out.flush();
    }

    private static Throwable tryLoadFromFile(Path file) {
        if (file == null || !Files.exists(file)) {
            return null;
        }
        try {
            System.load(file.toAbsolutePath().toString());
            return null;
        } catch (UnsatisfiedLinkError | SecurityException ex) {
            // 返回原因给上层；不能静默丢失依赖加载失败的诊断信息。
            return ex;
        }
    }

    private static Map<String, String> loadHashManifest() {
        ClassLoader loader = SM9NativeLoader.class.getClassLoader();
        try (InputStream in = loader.getResourceAsStream(HASH_MANIFEST)) {
            if (in == null) {
                throw new SM9Exception("SM9 JAR 缺少 native SHA-256 清单 / native hash manifest is missing");
            }
            byte[] bytes = readAll(in);
            Map<String, String> result = new HashMap<>();
            String text = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            for (String line : text.split("\\R")) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                String[] parts = trimmed.split("\\s+", 2);
                if (parts.length != 2 || !parts[0].matches("[0-9a-fA-F]{64}")) {
                    throw new SM9Exception("SM9 native SHA-256 清单格式无效 / invalid native hash manifest entry: " + line);
                }
                result.put(parts[1].trim(), parts[0].toLowerCase(Locale.ROOT));
            }
            return result;
        } catch (IOException ex) {
            throw new SM9Exception(SM9Messages.nativeUnavailable(ex), ex);
        }
    }

    private static byte[] readAll(InputStream in) throws IOException {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        copy(in, out);
        return out.toByteArray();
    }

    private static void verifyResourceHash(String resource, Path file, Map<String, String> hashes) {
        if (hashes == null) {
            throw new SM9Exception("SM9 native 未提供 SHA-256 清单 / native hash manifest is unavailable");
        }
        String expected = hashes.get(resource);
        if (expected == null) {
            throw new SM9Exception("SM9 native 未登记 SHA-256: " + resource
                    + " / native resource is not listed in the hash manifest");
        }
        try {
            byte[] actualBytes = MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file));
            String actual = toHex(actualBytes);
            if (!expected.equals(actual)) {
                throw new SM9Exception("SM9 native SHA-256 校验失败: " + resource
                        + "，期望 " + expected + "，实际 " + actual);
            }
        } catch (NoSuchAlgorithmException | IOException ex) {
            throw new SM9Exception(SM9Messages.nativeUnavailable(ex), ex);
        }
    }

    /** 供单元测试验证清单格式和篡改检测，不加载 native。 */
    static void verifyHashForTest(byte[] content, String expected) {
        try {
            String actual = toHex(MessageDigest.getInstance("SHA-256").digest(content));
            if (!actual.equalsIgnoreCase(expected)) {
                throw new SM9Exception("SM9 native SHA-256 校验失败 / native hash mismatch");
            }
        } catch (NoSuchAlgorithmException ex) {
            throw new SM9Exception(SM9Messages.nativeUnavailable(ex), ex);
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            result.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        }
        return result.toString();
    }

    private static void addSuppressed(Throwable target, Throwable cause) {
        if (cause != null && cause != target) {
            target.addSuppressed(cause);
        }
    }

    /**
     * 探测当前平台标识，例如 {@code linux-x86_64}。
     *
     * @return 平台标识
     * @throws SM9UnsupportedPlatformException 无法识别的操作系统或架构
     */
    static String detectPlatform() {
        String os = osToken();
        String arch = archToken();
        return os + "-" + arch;
    }

    private static String osToken() {
        String osName = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        if (osName.contains("linux")) {
            return "linux";
        }
        if (osName.contains("mac") || osName.contains("darwin")) {
            return "darwin";
        }
        if (osName.contains("windows")) {
            return "windows";
        }
        throw new SM9UnsupportedPlatformException(
                SM9Messages.nativeUnavailable(new IllegalStateException(
                        "不支持的操作系统 / unsupported OS: " + osName)));
    }

    private static String archToken() {
        String arch = System.getProperty("os.arch", "").toLowerCase(Locale.ROOT);
        if (arch.equals("amd64") || arch.equals("x86_64") || arch.equals("x64")) {
            return "x86_64";
        }
        if (arch.equals("aarch64") || arch.equals("arm64")) {
            return "aarch64";
        }
        throw new SM9UnsupportedPlatformException(
                SM9Messages.nativeUnavailable(new IllegalStateException(
                        "不支持的 CPU 架构 / unsupported CPU arch: " + arch)));
    }

    private static String bridgeLibFileName() {
        String osName = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        if (osName.contains("windows")) {
            return BRIDGE_LIB_NAME + ".dll";
        }
        if (osName.contains("mac") || osName.contains("darwin")) {
            return "lib" + BRIDGE_LIB_NAME + ".dylib";
        }
        return "lib" + BRIDGE_LIB_NAME + ".so";
    }

    private static String dependencyLibFileName() {
        String osName = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        if (osName.contains("windows")) {
            return "gmssl.dll";
        }
        if (osName.contains("mac") || osName.contains("darwin")) {
            return "libgmssl.3.dylib";
        }
        return "libgmssl.so.3";
    }
}
