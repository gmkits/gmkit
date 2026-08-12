# CHANGELOG

## 0.10.1 - 2026-07-20

### Release correction

- Retried the Java test release after the first `0.10.0` tag was rejected by
  Maven Central authentication; `0.10.0` remains an unpublished failed tag.
- Limited the Central reactor to `gmkit-parent`, `gmkit-bom`, `gmkit`, and
  `gmkit-sm9`; internal `gmkit-benchmarks` is not included in the upload.

## 0.10.0 - 2026-07-19

### Monorepo merge

- Merged the TypeScript and Java stacks into a single polyglot monorepo.
  The TypeScript stack now lives under `packages/ts/`, the Java stack under
  `packages/java/`, the documentation portal under `docs/site/`, demo apps under `apps/`,
  and cross-language vectors under `vectors/`.
- TypeScript npm package name remains `gmkitx`; Java Maven coordinates
  remain `cn.gmkit:gmkit:0.10.0`.
- Kept deprecated TypeScript top-level compatibility aliases such as
  `generateKeyPair`, `sign`, `verify`, `digest`, and `hmac` so existing
  consumers can upgrade safely. New code should use `sm2GenerateKeyPair`,
  `sm2Sign`, `sm2Verify`, `sm3Digest`, `sm3Hmac`, or the algorithm namespaces.
- CI rebuilt into `ci.yml`, `parity.yml`, `sm9-native.yml`, `docs.yml`,
  `publish-ts.yml`, and `publish-java.yml` with monorepo `paths:` filters.
- Release tag pattern updated: TS only accepts `ts-v*`, Java only accepts
  `java-v*`; unprefixed `v*` tags no longer publish either language.
- Added the Vue3 + Vite GMKit Studio application under `apps/gmkit-studio/`.
  Studio is not part of the npm or Maven release artifacts.
- Added `vectors/interop.json` shared cross-language vectors, consumed by
  `packages/ts/test/interop-compliance.test.ts` and
  `cn.gmkit.InteropComplianceTest` (Maven test-resources mount + zero-dep
  classpath loader `cn.gmkit.test.Vectors`).

### Java SM9 packaging and release

- Consolidated the Java SM9 API, JNI bridge, and Linux x86_64/aarch64,
  macOS x86_64/aarch64, and Windows x86_64 runtimes into the single
  `cn.gmkit:gmkit-sm9` dependency. Applications that do not use SM9 continue
  to depend only on `cn.gmkit:gmkit` and do not download native files.
- Removed the unpublished `gmkit-sm9-native-*` modules. `SM9NativeLoader`
  still prefers an explicit `gmkit.sm9.native.path`, then system libraries,
  then the current platform resource from the aggregate JAR.
- Fixed the packaged GmSSL source commit and added license, NOTICE, platform,
  filename, and SHA-256 manifests to the aggregate SM9 artifact.
- Maven Central publishing now audits and deploys only `gmkit-parent`,
  `gmkit-bom`, `gmkit`, and `gmkit-sm9`. The benchmark module is never
  deployed.
- Java release CI builds five native runtimes, assembles one SM9 JAR, and
  consumes that same JAR on all five platforms before Central publishing.
  The packaged-runtime test covers standard UTF-8 SM9 identities including
  Chinese, supplementary-plane emoji, surrounding spaces, and embedded NUL,
  plus Unicode PEM passwords and file paths.
  npm publishing now uses Trusted Publisher with GitHub OIDC.

### Fixed

- Corrected ZUC EEA3/EIA3 to the 3GPP TS 35.221/35.222 IV layouts, key-stream sizing, final MAC word, non-byte-aligned masking, and parameter validation. Added `eea3Encrypt` while retaining the older `eea3` key-stream API.
- Added binary-safe `sm2DecryptBytes`, `sm4DecryptBytes`, and `zucDecryptBytes` APIs so arbitrary plaintext bytes are not forced through UTF-8 decoding.
- Hardened SM2 DER ciphertext parsing, userId ENTL bounds, standard-curve enforcement, signing-scalar validation, key-pair consistency checks, all-zero KDF retry, empty-plaintext rejection, and key-exchange length validation without changing the empty-userId compatibility fallback.
- Added a deterministic SM2 key-exchange vector whose shared key and S1/S2 confirmation tags are consumed by both TypeScript and Java/Bouncy Castle.
- Passed SM9 identities across JNI as standard UTF-8 bytes with an explicit length instead of JNI Modified UTF-8 plus `strlen`; validation now preserves significant surrounding whitespace.
- Passed SM9 PEM passwords and paths as explicit standard UTF-8 bytes, used wide-character file APIs on Windows, rejected embedded NUL, and cleared temporary native password buffers.
- Bounded SM9 DER ciphertext before JNI decryption, queried GmSSL output length before writing the fixed plaintext buffer, and cleared native plaintext after returning it to Java.
- Replaced SM3 chunk accumulation with a true incremental compression state and added fixed HMAC-SM3 verification.
- Added matching TypeScript and Java/Bouncy Castle fixed outputs for SM4 CTR/CFB/OFB/GCM/CCM and runtime validation for unsupported SHA output formats.
- Validated RNG policies and custom RNG output, split Web Crypto requests at the 65536-byte platform limit, and kept the default warning compatibility fallback plus opt-in strict mode.
- Reset reusable SHA-1/256/384/512 instances after `digest()` so implementation behavior now matches the documented streaming contract.
- Made Java and TypeScript parity fail closed on missing, empty, malformed, duplicated, unsupported, or zero-match shared vectors. Java now consumes every SM2/SM3/SM4/ZUC case instead of skipping SM2.
- Rejected malformed and non-canonical Base64 input, including invalid padding and non-zero pad bits, while retaining explicit unpadded decoding compatibility.
- Rejected truncated or excessively nested ASN.1 input in the public XML visualization helper.
- Updated the inlined Noble curve/hash implementation and the Vitest/Vite build chain. The release audit covered the dependency graph available at release time; current workspace and documentation-tooling audit results are reported separately and are not implied by this historical note.
- Added real npm tarball install tests for ESM, CommonJS, browser IIFE, and deprecated compatibility aliases across the supported Node.js release matrix.

- **TS SM4 CK table — GB/T 32907-2016 conformance fix**.
  The `CK[i]` constant generation in `packages/ts/src/crypto/sm4/index.ts` omitted
  the standard's required `×7 mod 256` multiplier, producing wrong round
  keys for every SM4 block encryption. Bug surfaced when the InteropCompliance
  suite was extended to verify Java↔TS bit-for-bit equality, and root-caused
  by verifying BouncyCastle SM4 passes GB/T 32907-2016 §A.1 standard vector
  while TS did not. Fix: `CK[i]` bytes now `((4i+j)*7) & 0xff`.
  TS now produces `681edf34d206965e86b3e94f536e4246` for the official
  standard input. All 6 affected vectors in `vectors/interop.json` regenerated
  from the corrected implementation (3 sm4-ecb-*, 3 sm4-cbc-*); both stacks
  now produce byte-identical output. `cn.gmkit.InteropComplianceTest`
  now consumes the same complete dynamic case set as TypeScript.

### Added

- Added `test/aligned-gm-coverage.test.ts` to align TypeScript SM2, SM3, SM4, and ZUC behavior with the Java-side test口径 where the same algorithms are supported.
- Added Unicode coverage for Chinese text, emoji, mixed Unicode, newlines, tabs, surrounding spaces, symbols, long text, and binary `Uint8Array` payloads.
- Added stricter ZUC project vectors for key stream bytes, key stream words, UTF-8 payload encryption, Base64 ciphertext, binary payloads, EEA3, and EIA3.
- Extended `packages/ts/test/interop-compliance.test.ts` and `vectors/interop.json` with strict SM4 ciphertext assertions and shared ZUC/SM3 project vectors.

### Documentation

- Reworked all existing public documentation pages instead of deleting the
  Go, Python, Rust, Hutool, international-algorithm, performance, and
  maintenance pages. Each page now states its implementation source,
  protocol boundary, version scope, and reproducible verification command.
- Added executable release examples for the built gmkitx package, Web Crypto
  AES-GCM/RSA-OAEP, Go gmsm, Python gmssl, RustCrypto SM3/SM4, and
  Hutool/Bouncy Castle. Added a Java documentation test that compiles the
  current fluent GMKit Java API examples.
- Added documentation link/API audits and wired the checks, external-language
  toolchains, example tests, and VuePress build into the docs workflow.
- Removed unsupported or unverifiable claims from the docs, including a
  non-existent GMKit Java SHA module, stale JavaBean accessors, floating CDN
  versions, unqualified performance numbers, and ordinary SM3/SHA password
  storage advice.
- Corrected the README and VuePress docs support matrix: TypeScript supports SM2, SM3, SM4, ZUC-128, and SHA; it does not support SM9.
- Documented the SM2 public-key, C1C3C2/C1C2C3, ASN.1 DER ciphertext, raw/DER signature, and default userId boundaries.
- Documented SM4 mode, padding, IV/nonce, tag length, and AAD requirements for ECB/CBC/CTR/CFB/OFB/GCM/CCM.
- Documented that ZUC fixed values in this repository are project alignment vectors unless explicitly marked as external standard vectors.
- Added runnable self-test commands for build, type-check, unit tests, and a Node `dist` SM3 example.
- Added npm third-party notices for bundled noble code and package-audit gates for required files, runtime dependency leakage, and public declaration imports.
- Reworked the public documentation into release-oriented architecture,
  support matrix, validation model, security-boundary, compatibility,
  benchmark, distribution, and release pages. Documentation CI now checks
  manifest versions, all TypeScript exports, fixture dependency versions,
  vector structure, links, navigation, and executable ESM/CJS/IIFE examples.

### Fixed

- Replaced stale SM4 interop expectations after the standard CK correction and made the assertions strict across both implementations.
- Covered invalid ZUC key/IV length, invalid hex/base64 ciphertext, invalid EEA3/EIA3 parameters, and tampered SM4 AEAD tag behavior in tests.

### Compatibility

- Deprecated TypeScript top-level compatibility aliases remain available.
  Downstream code should migrate to prefixed functions or algorithm namespaces
  without requiring a flag-day upgrade.
- Empty SM2 `userId` values continue to select `DEFAULT_USER_ID`. RNG defaults
  to warning-and-fallback compatibility in runtimes without CSPRNG; strict
  consumers can opt into `configureRNG('strict')`.
- SM9 remains unsupported in TypeScript; no C, WASM, or native wrapper was added.
- `0.x` remains the public testing line. The project will enter the formal
  stability line at `1.x`; testing status does not permit silent API removal.
