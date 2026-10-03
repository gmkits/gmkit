package cn.gmkit.sm9;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.junit.jupiter.api.io.TempDir;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 隔离 JVM 只读取测试 JAR，覆盖真正的资源查找、清单解析和加载前校验。 */
@EnabledIf(value = "cn.gmkit.sm9.SM9Assumptions#platformSupportedOrNativeRequired",
        disabledReason = "Resource fixture requires a supported platform; native-required builds never skip")
class SM9NativeLoaderHashTest {
    @TempDir
    Path directory;
    private static final byte[] CONTENT = "not-a-native-library".getBytes(StandardCharsets.UTF_8);

    @Test
    void rejectsMissingManifest() throws Exception {
        runFixture(null, false, "native hash manifest is missing");
    }

    @Test
    void rejectsMalformedManifest() throws Exception {
        runFixture("invalid entry\n", false, "invalid native hash manifest entry");
    }

    @Test
    void rejectsDuplicateManifestEntry() throws Exception {
        String entry = entry(dependencyResource());
        runFixture(entry + entry, false, "duplicate native hash entry");
    }

    @Test
    void rejectsUnlistedResource() throws Exception {
        runFixture(entry(bridgeResource()), false, "native resource is not listed");
    }

    @Test
    void rejectsTamperedBridgeBeforeLoadingDependency() throws Exception {
        // 依赖摘要正确但不是动态库；若先加载它，将收到链接错误而非桥接库摘要错误。
        runFixture(entry(dependencyResource()) + entry(bridgeResource()), true, bridgeResource());
    }

    @Test
    void matchingHashesReachNativeLinker() throws Exception {
        runFixture(entry(dependencyResource()) + entry(bridgeResource()), false,
                "LOADER_CAUSE=java.lang.UnsatisfiedLinkError");
    }

    private String dependencyResource() {
        String platform = SM9NativeLoader.detectPlatform();
        String file = platform.startsWith("windows") ? "gmssl.dll"
                : platform.startsWith("darwin") ? "libgmssl.3.dylib" : "libgmssl.so.3";
        return "native/" + platform + "/" + file;
    }

    private String bridgeResource() {
        String platform = SM9NativeLoader.detectPlatform();
        String file = platform.startsWith("windows") ? "gmkitsm9.dll"
                : platform.startsWith("darwin") ? "libgmkitsm9.dylib" : "libgmkitsm9.so";
        return "native/" + platform + "/" + file;
    }

    private String entry(String resource) throws Exception {
        StringBuilder hash = new StringBuilder();
        for (byte value : MessageDigest.getInstance("SHA-256").digest(CONTENT)) {
            hash.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        }
        return hash + "  " + resource + "\n";
    }

    private void runFixture(String manifest, boolean tamper, String expected) throws Exception {
        Path jar = directory.resolve("fixture.jar");
        try (JarOutputStream output = new JarOutputStream(Files.newOutputStream(jar))) {
            for (Class<?> type : new Class<?>[] {Probe.class, SM9NativeLoader.class, SM9Messages.class,
                    SM9Exception.class, SM9UnsupportedPlatformException.class}) {
                String name = type.getName().replace('.', '/') + ".class";
                output.putNextEntry(new JarEntry(name));
                try (InputStream input = type.getClassLoader().getResourceAsStream(name)) {
                    byte[] buffer = new byte[8192];
                    int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                }
                output.closeEntry();
            }
            writeEntry(output, dependencyResource(), CONTENT);
            writeEntry(output, bridgeResource(), tamper ? new byte[] {0x01} : CONTENT);
            if (manifest != null) {
                writeEntry(output, "META-INF/gmkit/sm9-native.sha256", manifest.getBytes(StandardCharsets.UTF_8));
            }
        }
        Path log = directory.resolve("child.log");
        String java = Paths.get(System.getProperty("java.home"), "bin", "java").toString();
        ProcessBuilder builder = new ProcessBuilder(java, "-Djava.library.path=" + directory,
                "-cp", jar.toString(), Probe.class.getName());
        // 隔离外部 Java 参数，防止本机 runtime 或 agent 使损坏资源用例意外成功。
        for (String key : new String[] {"JAVA_TOOL_OPTIONS", "JDK_JAVA_OPTIONS", "_JAVA_OPTIONS"}) {
            builder.environment().remove(key);
        }
        Process child = builder.redirectErrorStream(true).redirectOutput(log.toFile()).start();
        try {
            assertTrue(child.waitFor(20, TimeUnit.SECONDS), "loader child JVM timed out");
            String diagnostic = new String(Files.readAllBytes(log), StandardCharsets.UTF_8);
            assertEquals(0, child.exitValue(), diagnostic);
            assertTrue(diagnostic.contains(expected), diagnostic);
            assertTrue(diagnostic.contains("SYSTEM_FAILURE_PRESERVED"), diagnostic);
            if (tamper) assertTrue(diagnostic.contains("SHA-256"), diagnostic);
        } finally {
            child.destroyForcibly();
        }
    }

    private void writeEntry(JarOutputStream output, String name, byte[] bytes) throws Exception {
        output.putNextEntry(new JarEntry(name));
        output.write(bytes);
        output.closeEntry();
    }

    public static final class Probe {
        public static void main(String[] args) {
            try {
                SM9NativeLoader.load();
                throw new AssertionError("Fixture must never load successfully");
            } catch (SM9Exception expected) {
                expected.printStackTrace(System.out);
                System.out.println("LOADER_CAUSE=" + (expected.getCause() == null
                        ? "none" : expected.getCause().getClass().getName()));
                if (expected.getSuppressed().length != 1
                        || !(expected.getSuppressed()[0] instanceof UnsatisfiedLinkError)) {
                    throw new AssertionError("System library failure was lost", expected);
                }
                System.out.println("SYSTEM_FAILURE_PRESERVED");
            }
        }
    }
}
