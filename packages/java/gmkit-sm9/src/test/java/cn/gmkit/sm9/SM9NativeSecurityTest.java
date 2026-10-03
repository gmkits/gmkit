package cn.gmkit.sm9;

import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Permission;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** 隔离 JVM 中验证加载失败诊断，不执行 SM9 native 库。 */
class SM9NativeSecurityTest {
    @TempDir
    Path directory;

    @ParameterizedTest
    @ValueSource(strings = {"os.name", "os.arch", "gmkit.sm9.native.path", "temp-write"})
    void diagnosticsSurviveDeniedAccess(String denied) throws Exception {
        runProbe(denied, false);
    }

    @ParameterizedTest
    @ValueSource(strings = {"os.name", "gmkit.sm9.native.path"})
    void fatalErrorsAreNotHidden(String denied) throws Exception {
        runProbe(denied, true);
    }

    private void runProbe(String denied, boolean fatal) throws Exception {
        String version = System.getProperty("java.specification.version");
        int feature = Integer.parseInt(version.startsWith("1.") ? version.substring(2) : version);
        assumeTrue(feature < 24,
                "SecurityManager is permanently disabled on JDK 24+; no native execution was tested");

        Path jar = directory.resolve("security-fixture.jar");
        try (JarOutputStream output = new JarOutputStream(Files.newOutputStream(jar))) {
            for (Class<?> type : new Class<?>[] {Probe.class, DenyingSecurityManager.class,
                    SM9.class, SM9NativeBridge.class, SM9NativeLoader.class, SM9Messages.class,
                    SM9Exception.class, SM9UnsupportedPlatformException.class, SM9Checks.class,
                    SM9Signature.class, SM9SignKey.class, SM9SignMasterKey.class,
                    SM9EncKey.class, SM9EncMasterKey.class}) {
                String name = type.getName().replace('.', '/') + ".class";
                output.putNextEntry(new JarEntry(name));
                try (InputStream input = type.getClassLoader().getResourceAsStream(name)) {
                    byte[] buffer = new byte[8192];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        output.write(buffer, 0, count);
                    }
                }
                output.closeEntry();
            }
        }

        List<String> command = new ArrayList<>();
        command.add(Paths.get(System.getProperty("java.home"), "bin", "java").toString());
        if (feature >= 18) {
            command.add("-Djava.security.manager=allow");
        }
        command.add("-Djava.library.path=" + directory);
        command.add("-Djava.io.tmpdir=" + directory);
        command.add("-cp");
        command.add(jar.toString());
        command.add(Probe.class.getName());
        command.add(denied);
        command.add(Boolean.toString(fatal));
        ProcessBuilder builder = new ProcessBuilder(command);
        for (String key : new String[] {"JAVA_TOOL_OPTIONS", "JDK_JAVA_OPTIONS", "_JAVA_OPTIONS"}) {
            builder.environment().remove(key);
        }
        Path log = directory.resolve("child.log");
        Process child = builder.redirectErrorStream(true).redirectOutput(log.toFile()).start();
        try {
            assertTrue(child.waitFor(20, TimeUnit.SECONDS), "security child JVM timed out");
            String diagnostic = new String(Files.readAllBytes(log), StandardCharsets.UTF_8);
            if (child.exitValue() == 77 && diagnostic.contains("SECURITY_MANAGER_UNAVAILABLE")) {
                assumeTrue(false, "SecurityManager unavailable in child JVM; no native execution was tested: "
                        + diagnostic);
            }
            assertEquals(0, child.exitValue(), diagnostic);
            assertTrue(diagnostic.contains(fatal ? "FATAL_ERROR_PRESERVED" : "SECURITY_DIAGNOSTICS_PRESERVED"),
                    diagnostic);
        } finally {
            child.destroyForcibly();
            child.waitFor(5, TimeUnit.SECONDS);
        }
    }

    @SuppressWarnings("removal")
    public static final class Probe {
        public static void main(String[] args) {
            String denied = args[0];
            boolean fatal = Boolean.parseBoolean(args[1]);
            String platform;
            try {
                platform = SM9NativeLoader.detectPlatform();
            } catch (SM9UnsupportedPlatformException ex) {
                platform = "unsupported";
            }
            if ("temp-write".equals(denied) && "unsupported".equals(platform)) {
                // 不支持 SM9 平台命名的主机也需要覆盖临时目录权限检查。
                System.setProperty("os.name", "Linux");
                System.setProperty("os.arch", "amd64");
                platform = SM9NativeLoader.detectPlatform();
            }
            DenyingSecurityManager manager = new DenyingSecurityManager(denied, fatal);
            try {
                System.setSecurityManager(manager);
            } catch (UnsupportedOperationException ex) {
                System.out.println("SECURITY_MANAGER_UNAVAILABLE: " + ex);
                System.exit(77);
                return;
            }

            if (fatal) {
                try {
                    SM9.isAvailable();
                    throw new AssertionError("A JVM Error must not become an unavailable diagnostic");
                } catch (OutOfMemoryError expected) {
                    require(expected == manager.fatalFailure, "The original JVM Error was replaced");
                    System.out.println("FATAL_ERROR_PRESERVED");
                }
                return;
            }

            for (int attempt = 0; attempt < 2; attempt++) {
                require(!SM9.isAvailable(), "Denied native access must be unavailable");
                String expectedPlatform = denied.startsWith("os.") ? "unsupported" : platform;
                require(expectedPlatform.equals(SM9.nativePlatform()), "Platform diagnostic was lost");
                Throwable error = SM9NativeBridge.loadError();
                require(error instanceof SecurityException, "Security failure cause was lost");
                require(manager.firstFailure != null, "The selected permission was never denied");
                require(SM9.nativeLoadErrorMessage().contains(error.getMessage()),
                        "Security failure message was lost");
                if ("temp-write".equals(denied)) {
                    // 临时目录写入被拒时，仍须保留此前系统库加载失败的同一个异常对象。
                    require(manager.systemLoadFailure != null, "System library loading was never attempted");
                    boolean systemFailurePreserved = false;
                    for (Throwable suppressed : error.getSuppressed()) {
                        systemFailurePreserved |= suppressed == manager.systemLoadFailure;
                    }
                    require(systemFailurePreserved, "System library failure was lost after denied temp write");
                } else {
                    // JDK 会隐藏默认临时目录的原始权限异常，其余路径须保留原始异常对象。
                    boolean preserved = error == manager.firstFailure;
                    for (Throwable suppressed : error.getSuppressed()) {
                        preserved |= suppressed == manager.firstFailure;
                    }
                    require(preserved, "The first security failure was lost");
                }
                try {
                    SM9NativeBridge.requireAvailable();
                    throw new AssertionError("Native operations must fail before JNI");
                } catch (SM9UnsupportedPlatformException expected) {
                    require(expected.getCause() == error, "Operation failure lost its diagnostic cause");
                }
            }
            System.out.println("SECURITY_DIAGNOSTICS_PRESERVED");
        }

        private static void require(boolean condition, String message) {
            if (!condition) {
                throw new AssertionError(message);
            }
        }
    }

    @SuppressWarnings("removal")
    public static final class DenyingSecurityManager extends SecurityManager {
        private final String denied;
        private final boolean fatal;
        final OutOfMemoryError fatalFailure = new OutOfMemoryError("Injected JVM Error; no memory exhausted");
        SecurityException firstFailure;
        SecurityException systemLoadFailure;

        DenyingSecurityManager(String denied, boolean fatal) {
            this.denied = denied;
            this.fatal = fatal;
        }

        @Override
        public void checkPermission(Permission permission) {
            // 仅拒绝此子 JVM 中明确选定的权限边界。
        }

        @Override
        public void checkPropertyAccess(String key) {
            if (denied.equals(key)) {
                reject();
            }
        }

        @Override
        public void checkWrite(String file) {
            if ("temp-write".equals(denied)) {
                reject();
            }
        }

        @Override
        public void checkLink(String library) {
            if (library.contains("gmkitsm9") || library.contains("gmssl")) {
                systemLoadFailure = new SecurityException("SM9 native loading is disabled in this diagnostic fixture");
                throw systemLoadFailure;
            }
        }

        private void reject() {
            if (fatal) {
                throw fatalFailure;
            }
            SecurityException failure = new SecurityException("DENIED:" + denied);
            if (firstFailure == null) {
                firstFailure = failure;
            }
            throw failure;
        }
    }
}
