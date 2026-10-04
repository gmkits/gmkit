# CHANGELOG

## 未发布

- 修复无 `04` 点前缀的 SM2 密文在 X 坐标首字节恰为 `04` 时偶发解密失败的问题；两个排列模式都有确定性回归及篡改拒绝断言。固定 k=11 仅为测试夹具，不能用于真实加密。

- SM9 签名/加密主密钥导入改用受检查的 JNI 解析路径，修复固定 GmSSL 版本要求 DER 标量恰为 32 字节导致的导出后无法重新导入问题，以及加密主密钥解析失败时误返回成功的问题。
- 保留 GmSSL PEM/PBES2 导出格式和 PRF 省略时的 SM3 兼容行为；拒绝零、负数、超宽/越界标量和损坏结构，并清理敏感缓冲区。
- 固定标量回归明确为项目 fixture；BC 仅用于测试生成加密封装，不新增生产依赖。现有 `0.10.1` 制品不变，待后续版本发布。

## 0.10.1 - 2026-07-20

### Fixed

- Prepared a retry release after Maven Central rejected the unpublished
  `0.10.0` upload with HTTP 401.
- Excluded the internal benchmark module from the Central publishing reactor.

## 0.10.0 - 2026-07-19

### Added

- Added the `cn.gmkit.zuc.ZUC` and `cn.gmkit.zuc.ZUCUtil` ZUC-128 APIs for key stream generation, encryption/decryption, Base64/hex helpers, EEA3, and EIA3-compatible MAC output.
- Added Java ZUC tests for project key stream vectors, Unicode payloads, empty payloads, binary payloads, Base64 ciphertext, EEA3/EIA3, utility facade delegation, and invalid inputs.
- Strengthened SM2 tests with compressed public keys, both `C1C3C2` and `C1C2C3`, raw/DER signatures, wrong userId checks, Chinese text, emoji, mixed Unicode, newlines, tabs, spaces, and long text.
- Strengthened SM3 tests with fixed project vectors for empty, ASCII, Chinese, emoji, mixed Unicode, newlines/tabs, spaces, symbols, and long text.
- Strengthened SM4 tests with fixed CTR/CFB/OFB/GCM/CCM outputs shared with TypeScript, plus Unicode payloads, long text, AAD, and tag verification.
- Strengthened SM9 tests for native-gated Unicode signing/verifying and IBE encryption/decryption, including wrong identity and tampered data coverage.
- Made shared-vector tests fail closed and required Java to consume every SM2/SM3/SM4/ZUC parity case.

### Changed

- Consolidated the SM9 Java API, JNI bridge, and five supported platform runtimes into the single `cn.gmkit:gmkit-sm9` dependency.
- Removed the unpublished `gmkit-sm9-native-*` modules and simplified the BOM to manage only `gmkit` and `gmkit-sm9`.
- Kept the native loading order compatible: explicit `gmkit.sm9.native.path`, system library lookup, then the current platform resource from the aggregate JAR.
- Added fixed GmSSL source metadata, Apache-2.0/GmSSL notices, and SHA-256 manifests for all ten packaged dynamic-library files.
- Restricted Maven Central publication to `gmkit-parent`, `gmkit-bom`, `gmkit`, and `gmkit-sm9`; `gmkit-benchmarks` is excluded from deployment.
- Rebuilt release CI to assemble one multi-platform SM9 JAR and consume-test that same JAR on Linux x86_64/aarch64, macOS x86_64/aarch64, and Windows x86_64 before publication.

### Documentation

- Updated the README support matrix to include ZUC in the main Java runtime and to keep SM9 documented as an independent JNI/GmSSL module.
- Documented SM2 public-key formats, `C1C3C2`/`C1C2C3`, DER/ASN.1 ciphertext helpers, raw/DER signatures, default userId, and empty-plaintext behavior.
- Documented SM4 mode, padding, IV/nonce, tag length, and AAD requirements.
- Documented the SM9 JNI/native loading order, single-dependency runtime packaging, unsupported platforms, 255-byte single-encryption limit, and lack of SM9 key exchange support.

### Fixed

- Added explicit ZUC validation and tests for invalid key/IV length, invalid hex/base64, negative lengths, null payloads, invalid bearer, and invalid direction.
- Restored the documented SM2 compatibility rule that `null` and empty user IDs both resolve to `SM2.DEFAULT_USER_ID`, including key-exchange identities.
- Passed SM9 PEM passwords and paths through JNI as standard UTF-8, used wide-character file APIs on Windows, rejected embedded NUL, and covered Unicode PEM round trips in native CI.
- Rejected SM9 DER ciphertext above 367 bytes before JNI, queried the GmSSL plaintext size before decryption, and cleared the native plaintext buffer after returning it to Java.
- Updated the `gmkit` module description to match the implemented SM2/SM3/SM4/ZUC support.

### Compatibility

- The main `gmkit` artifact now exposes new ZUC public APIs; no existing SM2/SM3/SM4 API was removed.
- Applications that do not need SM9 still depend only on `gmkit`; applications that need SM9 add only `gmkit-sm9` and no platform-specific dependency.
- SM9 remains native-gated: when no supported bundled runtime, system library, or explicit native path is available, `SM9.isAvailable()` is false and native-dependent tests are skipped.
- ZUC fixed values are project alignment vectors shared with TypeScript tests unless separately identified as external standard vectors.
