/*
 * GMKit SM9 JNI 桥接实现。
 *
 * 该文件实现 cn.gmkit.sm9.SM9NativeBridge 中声明的所有 native 方法，
 * 直接调用 GmSSL v3.1.1 的 SM9 C API。所有 SM9 native 资源以堆上分配的
 * 结构体指针形式（jlong 句柄）在 Java 与 C 之间传递，由 Java 层负责释放。
 *
 * 编译依赖：GmSSL v3.1.1（提供 <gmssl/sm9.h> 与共享库 gmssl）。
 */
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>
#include <jni.h>
#include <gmssl/asn1.h>
#include <gmssl/oid.h>
#include <gmssl/pbkdf2.h>
#include <gmssl/pkcs8.h>
#include <gmssl/sm4.h>
#include <gmssl/sm9.h>
#include <gmssl/error.h>

#ifdef _WIN32
#include <windows.h>
#endif

/* 将 jlong 句柄还原为对应类型的指针。 */
#define HANDLE_PTR(type, handle) ((type *)(intptr_t)(handle))
#define PTR_HANDLE(ptr)          ((jlong)(intptr_t)(ptr))

/* ------------------------------------------------------------------ */
/* 内部小工具                                                          */
/* ------------------------------------------------------------------ */

/* 复制 Java byte[] 并补 C 字符串终止符；嵌入 NUL 时拒绝，避免静默截断。 */
static char *copy_c_string(JNIEnv *env, jbyteArray value, size_t *length)
{
	jsize byte_length;
	char *result;

	if (value == NULL || length == NULL) {
		return NULL;
	}
	byte_length = (*env)->GetArrayLength(env, value);
	if (byte_length <= 0) {
		return NULL;
	}
	result = (char *)malloc((size_t)byte_length + 1);
	if (result == NULL) {
		return NULL;
	}
	(*env)->GetByteArrayRegion(env, value, 0, byte_length, (jbyte *)result);
	if ((*env)->ExceptionCheck(env) || memchr(result, '\0', (size_t)byte_length) != NULL) {
		free(result);
		return NULL;
	}
	result[byte_length] = '\0';
	*length = (size_t)byte_length;
	return result;
}

/* 敏感缓冲区释放或离开栈帧前清零，volatile 防止编译器删除写入。 */
static void secure_clear(void *value, size_t length)
{
	volatile unsigned char *cursor = (volatile unsigned char *)value;
	if (value == NULL) {
		return;
	}
	while (length-- > 0) {
		*cursor++ = 0;
	}
}

static void secure_free(char *value, size_t length)
{
	secure_clear(value, length);
	free(value);
}

/* Java 侧统一传标准 UTF-8。Windows 用宽字符路径，POSIX 直接使用 UTF-8 路径。 */
static FILE *open_file(JNIEnv *env, jbyteArray jfile, const char *mode)
{
	char *path;
	size_t path_length;
	FILE *fp = NULL;

	path = copy_c_string(env, jfile, &path_length);
	if (path == NULL) {
		return NULL;
	}
#ifdef _WIN32
	{
		int wide_length = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, path, -1, NULL, 0);
		wchar_t *wide_path;
		const wchar_t *wide_mode = strcmp(mode, "wb") == 0 ? L"wb" : L"rb";
		if (wide_length > 0) {
			wide_path = (wchar_t *)calloc((size_t)wide_length, sizeof(wchar_t));
			if (wide_path != NULL
				&& MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, path, -1,
					wide_path, wide_length) == wide_length) {
				fp = _wfopen(wide_path, wide_mode);
			}
			free(wide_path);
		}
	}
#else
	fp = fopen(path, mode);
#endif
	free(path);
	(void)path_length;
	return fp;
}

/* 固定 GmSSL d655c06 的 sm9_key.c 要求 INTEGER 解码后恰好 32 字节，但 DER 会省略前导零。
 * 保留原 PEM/PBES2 格式和密码原语，仅在这里将合法主密钥标量左补零到 32 字节。
 * 上游加密主密钥解码失败时还会误返回 1，因此两种主密钥导入统一走此检查路径。 */
static int master_key_info_decrypt_from_pem(void *master, int sign, const char *pass, FILE *fp)
{
	static const uint8_t order[32] = {
		0xb6,0x40,0x00,0x00,0x02,0xa3,0xa6,0xf1,0xd6,0x03,0xab,0x4f,0xf5,0x8e,0xc7,0x44,
		0x49,0xf2,0x93,0x4b,0x18,0xea,0x8b,0xee,0xe5,0x6e,0xe1,0x9c,0xd6,0x9e,0xcf,0x25
	};
	uint8_t encrypted[SM9_MAX_ENCED_PRIVATE_KEY_INFO_SIZE];
	uint8_t info[SM9_MAX_PRIVATE_KEY_INFO_SIZE];
	uint8_t key[SM4_KEY_SIZE];
	uint8_t scalar[32] = {0};
	SM4_KEY sm4_key;
	const uint8_t *cp = encrypted;
	const uint8_t *salt, *iv, *ciphertext, *sequence, *private_key, *integer, *point;
	size_t len, saltlen, ivlen, ciphertextlen, infolen, seqlen, privatelen, integerlen, pointlen;
	int iter, keylen, prf, cipher, version, alg, params;
	int ret = -1;

	/* PRF 省略时保留上游以 SM3 派生的兼容行为，不将其解释为通用 PBKDF2 的 SHA-1 默认值。 */
	if (pem_read(fp, sign ? PEM_SM9_SIGN_MASTER_KEY : PEM_SM9_ENC_MASTER_KEY,
			encrypted, &len, sizeof(encrypted)) != 1
		|| pkcs8_enced_private_key_info_from_der(&salt, &saltlen, &iter, &keylen, &prf,
			&cipher, &iv, &ivlen, &ciphertext, &ciphertextlen, &cp, &len) != 1
		|| len != 0 || iter <= 0 || (keylen != -1 && keylen != SM4_KEY_SIZE)
		|| (prf != -1 && prf != OID_hmac_sm3) || cipher != OID_sm4_cbc
		|| ivlen != SM4_BLOCK_SIZE || ciphertextlen == 0 || ciphertextlen % SM4_BLOCK_SIZE != 0
		|| ciphertextlen > sizeof(info)) {
		goto end;
	}
	if (pbkdf2_genkey(DIGEST_sm3(), pass, strlen(pass), salt, saltlen,
			(size_t)iter, sizeof(key), key) != 1) {
		goto end;
	}
	sm4_set_decrypt_key(&sm4_key, key);
	if (sm4_cbc_padding_decrypt(&sm4_key, iv, ciphertext, ciphertextlen, info, &infolen) != 1) {
		goto end;
	}
	cp = info;
	if (asn1_sequence_from_der(&sequence, &seqlen, &cp, &infolen) != 1 || infolen != 0
		|| asn1_int_from_der(&version, &sequence, &seqlen) != 1 || version != 0
		|| sm9_algor_from_der(&alg, &params, &sequence, &seqlen) != 1
		|| alg != OID_sm9 || params != (sign ? OID_sm9sign : OID_sm9encrypt)
		|| asn1_octet_string_from_der(&private_key, &privatelen, &sequence, &seqlen) != 1
		|| seqlen != 0 || privatelen > SM9_MAX_PRIVATE_KEY_SIZE
		|| asn1_sequence_from_der(&sequence, &seqlen, &private_key, &privatelen) != 1
		|| privatelen != 0
		|| asn1_integer_from_der(&integer, &integerlen, &sequence, &seqlen) != 1
		|| integerlen == 0 || integerlen > sizeof(scalar)
		|| (integerlen == 1 && integer[0] == 0)
		|| asn1_bit_octets_from_der(&point, &pointlen, &sequence, &seqlen) != 1
		|| seqlen != 0 || pointlen != (sign ? 129 : 65) || point[0] != 0x04) {
		goto end;
	}
	memcpy(scalar + sizeof(scalar) - integerlen, integer, integerlen);
	/* sm9_fn_from_bytes 只转换字节，不校验范围；零值已在上面拒绝，这里要求标量小于群阶。 */
	if (memcmp(scalar, order, sizeof(scalar)) >= 0) {
		goto end;
	}
	if (sign) {
		SM9_SIGN_MASTER_KEY *msk = (SM9_SIGN_MASTER_KEY *)master;
		if (sm9_fn_from_bytes(msk->ks, scalar) != 1
			|| sm9_twist_point_from_uncompressed_octets(&msk->Ppubs, point) != 1) {
			goto end;
		}
	} else {
		SM9_ENC_MASTER_KEY *msk = (SM9_ENC_MASTER_KEY *)master;
		if (sm9_fn_from_bytes(msk->ke, scalar) != 1
			|| sm9_point_from_uncompressed_octets(&msk->Ppube, point) != 1) {
			goto end;
		}
	}
	ret = 1;
end:
	secure_clear(info, sizeof(info));
	secure_clear(key, sizeof(key));
	secure_clear(scalar, sizeof(scalar));
	secure_clear(&sm4_key, sizeof(sm4_key));
	if (ret != 1) {
		secure_clear(master, sign ? sizeof(SM9_SIGN_MASTER_KEY) : sizeof(SM9_ENC_MASTER_KEY));
		error_print();
	}
	return ret;
}

/* ------------------------------------------------------------------ */
/* 签名主密钥                                                          */
/* ------------------------------------------------------------------ */

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignMasterKeyGenerate(JNIEnv *env, jclass cls)
{
	SM9_SIGN_MASTER_KEY *msk = (SM9_SIGN_MASTER_KEY *)calloc(1, sizeof(SM9_SIGN_MASTER_KEY));
	if (msk == NULL) {
		return 0;
	}
	if (sm9_sign_master_key_generate(msk) != 1) {
		free(msk);
		return 0;
	}
	return PTR_HANDLE(msk);
}

JNIEXPORT void JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignMasterKeyFree(JNIEnv *env, jclass cls, jlong handle)
{
	SM9_SIGN_MASTER_KEY *msk = HANDLE_PTR(SM9_SIGN_MASTER_KEY, handle);
	if (msk != NULL) {
		memset(msk, 0, sizeof(SM9_SIGN_MASTER_KEY));
		free(msk);
	}
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignMasterKeyInfoEncryptToPem0(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jpass, jbyteArray jfile)
{
	SM9_SIGN_MASTER_KEY *msk = HANDLE_PTR(SM9_SIGN_MASTER_KEY, handle);
	char *pass;
	size_t pass_length;
	FILE *fp;
	int ret;

	if (msk == NULL || jpass == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "wb");
	if (fp == NULL) {
		return 0;
	}
	pass = copy_c_string(env, jpass, &pass_length);
	if (pass == NULL) {
		fclose(fp);
		return 0;
	}
	ret = sm9_sign_master_key_info_encrypt_to_pem(msk, pass, fp);
	secure_free(pass, pass_length);
	fclose(fp);
	return ret == 1 ? 1 : 0;
}

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignMasterKeyInfoDecryptFromPem0(JNIEnv *env, jclass cls,
		jbyteArray jpass, jbyteArray jfile)
{
	SM9_SIGN_MASTER_KEY *msk;
	char *pass;
	size_t pass_length;
	FILE *fp;
	int ret;

	if (jpass == NULL) {
		return 0;
	}
	msk = (SM9_SIGN_MASTER_KEY *)calloc(1, sizeof(SM9_SIGN_MASTER_KEY));
	if (msk == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "rb");
	if (fp == NULL) {
		memset(msk, 0, sizeof(SM9_SIGN_MASTER_KEY));
		free(msk);
		return 0;
	}
	pass = copy_c_string(env, jpass, &pass_length);
	if (pass == NULL) {
		fclose(fp);
		memset(msk, 0, sizeof(SM9_SIGN_MASTER_KEY));
		free(msk);
		return 0;
	}
	ret = master_key_info_decrypt_from_pem(msk, 1, pass, fp);
	secure_free(pass, pass_length);
	fclose(fp);
	if (ret != 1) {
		memset(msk, 0, sizeof(SM9_SIGN_MASTER_KEY));
		free(msk);
		return 0;
	}
	return PTR_HANDLE(msk);
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignMasterPublicKeyToPem0(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jfile)
{
	SM9_SIGN_MASTER_KEY *mpk = HANDLE_PTR(SM9_SIGN_MASTER_KEY, handle);
	FILE *fp;
	int ret;

	if (mpk == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "wb");
	if (fp == NULL) {
		return 0;
	}
	ret = sm9_sign_master_public_key_to_pem(mpk, fp);
	fclose(fp);
	return ret == 1 ? 1 : 0;
}

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignMasterPublicKeyFromPem0(JNIEnv *env, jclass cls,
		jbyteArray jfile)
{
	SM9_SIGN_MASTER_KEY *mpk;
	FILE *fp;
	int ret;

	mpk = (SM9_SIGN_MASTER_KEY *)calloc(1, sizeof(SM9_SIGN_MASTER_KEY));
	if (mpk == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "rb");
	if (fp == NULL) {
		free(mpk);
		return 0;
	}
	ret = sm9_sign_master_public_key_from_pem(mpk, fp);
	fclose(fp);
	if (ret != 1) {
		free(mpk);
		return 0;
	}
	return PTR_HANDLE(mpk);
}

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignMasterKeyExtractKey(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jid)
{
	SM9_SIGN_MASTER_KEY *msk = HANDLE_PTR(SM9_SIGN_MASTER_KEY, handle);
	SM9_SIGN_KEY *key;
	jbyte *id;
	jsize idlen;
	int ret;

	if (msk == NULL || jid == NULL) {
		return 0;
	}
	key = (SM9_SIGN_KEY *)calloc(1, sizeof(SM9_SIGN_KEY));
	if (key == NULL) {
		return 0;
	}
	idlen = (*env)->GetArrayLength(env, jid);
	if (idlen <= 0) {
		memset(key, 0, sizeof(SM9_SIGN_KEY));
		free(key);
		return 0;
	}
	id = (*env)->GetByteArrayElements(env, jid, NULL);
	if (id == NULL) {
		memset(key, 0, sizeof(SM9_SIGN_KEY));
		free(key);
		return 0;
	}
	ret = sm9_sign_master_key_extract_key(msk, (const char *)id, (size_t)idlen, key);
	(*env)->ReleaseByteArrayElements(env, jid, id, JNI_ABORT);
	if (ret != 1) {
		memset(key, 0, sizeof(SM9_SIGN_KEY));
		free(key);
		return 0;
	}
	return PTR_HANDLE(key);
}

/* ------------------------------------------------------------------ */
/* 用户签名私钥                                                        */
/* ------------------------------------------------------------------ */

JNIEXPORT void JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignKeyFree(JNIEnv *env, jclass cls, jlong handle)
{
	SM9_SIGN_KEY *key = HANDLE_PTR(SM9_SIGN_KEY, handle);
	if (key != NULL) {
		memset(key, 0, sizeof(SM9_SIGN_KEY));
		free(key);
	}
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignKeyInfoEncryptToPem0(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jpass, jbyteArray jfile)
{
	SM9_SIGN_KEY *key = HANDLE_PTR(SM9_SIGN_KEY, handle);
	char *pass;
	size_t pass_length;
	FILE *fp;
	int ret;

	if (key == NULL || jpass == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "wb");
	if (fp == NULL) {
		return 0;
	}
	pass = copy_c_string(env, jpass, &pass_length);
	if (pass == NULL) {
		fclose(fp);
		return 0;
	}
	ret = sm9_sign_key_info_encrypt_to_pem(key, pass, fp);
	secure_free(pass, pass_length);
	fclose(fp);
	return ret == 1 ? 1 : 0;
}

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignKeyInfoDecryptFromPem0(JNIEnv *env, jclass cls,
		jbyteArray jpass, jbyteArray jfile)
{
	SM9_SIGN_KEY *key;
	char *pass;
	size_t pass_length;
	FILE *fp;
	int ret;

	if (jpass == NULL) {
		return 0;
	}
	key = (SM9_SIGN_KEY *)calloc(1, sizeof(SM9_SIGN_KEY));
	if (key == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "rb");
	if (fp == NULL) {
		memset(key, 0, sizeof(SM9_SIGN_KEY));
		free(key);
		return 0;
	}
	pass = copy_c_string(env, jpass, &pass_length);
	if (pass == NULL) {
		fclose(fp);
		memset(key, 0, sizeof(SM9_SIGN_KEY));
		free(key);
		return 0;
	}
	ret = sm9_sign_key_info_decrypt_from_pem(key, pass, fp);
	secure_free(pass, pass_length);
	fclose(fp);
	if (ret != 1) {
		memset(key, 0, sizeof(SM9_SIGN_KEY));
		free(key);
		return 0;
	}
	return PTR_HANDLE(key);
}

/* ------------------------------------------------------------------ */
/* 签名 / 验签上下文                                                   */
/* ------------------------------------------------------------------ */

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignCtxNew(JNIEnv *env, jclass cls)
{
	SM9_SIGN_CTX *ctx = (SM9_SIGN_CTX *)calloc(1, sizeof(SM9_SIGN_CTX));
	return PTR_HANDLE(ctx);
}

JNIEXPORT void JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignCtxFree(JNIEnv *env, jclass cls, jlong handle)
{
	SM9_SIGN_CTX *ctx = HANDLE_PTR(SM9_SIGN_CTX, handle);
	if (ctx != NULL) {
		memset(ctx, 0, sizeof(SM9_SIGN_CTX));
		free(ctx);
	}
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignInit(JNIEnv *env, jclass cls, jlong handle)
{
	SM9_SIGN_CTX *ctx = HANDLE_PTR(SM9_SIGN_CTX, handle);
	if (ctx == NULL) {
		return 0;
	}
	return sm9_sign_init(ctx) == 1 ? 1 : 0;
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignUpdate(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jdata, jint offset, jint length)
{
	SM9_SIGN_CTX *ctx = HANDLE_PTR(SM9_SIGN_CTX, handle);
	jbyte *data;
	jsize data_len;
	int ret;

	if (ctx == NULL || jdata == NULL || length < 0 || offset < 0) {
		return 0;
	}
	data_len = (*env)->GetArrayLength(env, jdata);
	if (offset > data_len || length > data_len - offset) {
		return 0;
	}
	data = (*env)->GetByteArrayElements(env, jdata, NULL);
	if (data == NULL) {
		return 0;
	}
	ret = sm9_sign_update(ctx, (const uint8_t *)(data + offset), (size_t)length);
	(*env)->ReleaseByteArrayElements(env, jdata, data, JNI_ABORT);
	return ret == 1 ? 1 : 0;
}

JNIEXPORT jbyteArray JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9SignFinish(JNIEnv *env, jclass cls,
		jlong ctxHandle, jlong keyHandle)
{
	SM9_SIGN_CTX *ctx = HANDLE_PTR(SM9_SIGN_CTX, ctxHandle);
	SM9_SIGN_KEY *key = HANDLE_PTR(SM9_SIGN_KEY, keyHandle);
	uint8_t sig[SM9_SIGNATURE_SIZE];
	size_t siglen = 0;
	jbyteArray result;

	if (ctx == NULL || key == NULL) {
		return NULL;
	}
	if (sm9_sign_finish(ctx, key, sig, &siglen) != 1) {
		return NULL;
	}
	result = (*env)->NewByteArray(env, (jsize)siglen);
	if (result == NULL) {
		return NULL;
	}
	(*env)->SetByteArrayRegion(env, result, 0, (jsize)siglen, (const jbyte *)sig);
	return result;
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9VerifyInit(JNIEnv *env, jclass cls, jlong handle)
{
	SM9_SIGN_CTX *ctx = HANDLE_PTR(SM9_SIGN_CTX, handle);
	if (ctx == NULL) {
		return 0;
	}
	return sm9_verify_init(ctx) == 1 ? 1 : 0;
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9VerifyUpdate(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jdata, jint offset, jint length)
{
	SM9_SIGN_CTX *ctx = HANDLE_PTR(SM9_SIGN_CTX, handle);
	jbyte *data;
	jsize data_len;
	int ret;

	if (ctx == NULL || jdata == NULL || length < 0 || offset < 0) {
		return 0;
	}
	data_len = (*env)->GetArrayLength(env, jdata);
	if (offset > data_len || length > data_len - offset) {
		return 0;
	}
	data = (*env)->GetByteArrayElements(env, jdata, NULL);
	if (data == NULL) {
		return 0;
	}
	ret = sm9_verify_update(ctx, (const uint8_t *)(data + offset), (size_t)length);
	(*env)->ReleaseByteArrayElements(env, jdata, data, JNI_ABORT);
	return ret == 1 ? 1 : 0;
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9VerifyFinish(JNIEnv *env, jclass cls,
		jlong ctxHandle, jbyteArray jsig, jlong mpkHandle, jbyteArray jid)
{
	SM9_SIGN_CTX *ctx = HANDLE_PTR(SM9_SIGN_CTX, ctxHandle);
	SM9_SIGN_MASTER_KEY *mpk = HANDLE_PTR(SM9_SIGN_MASTER_KEY, mpkHandle);
	jbyte *sig;
	jsize siglen;
	jbyte *id;
	jsize idlen;
	int ret;

	if (ctx == NULL || mpk == NULL || jsig == NULL || jid == NULL) {
		return 0;
	}
	siglen = (*env)->GetArrayLength(env, jsig);
	sig = (*env)->GetByteArrayElements(env, jsig, NULL);
	if (sig == NULL) {
		return 0;
	}
	idlen = (*env)->GetArrayLength(env, jid);
	if (idlen <= 0) {
		(*env)->ReleaseByteArrayElements(env, jsig, sig, JNI_ABORT);
		return 0;
	}
	id = (*env)->GetByteArrayElements(env, jid, NULL);
	if (id == NULL) {
		(*env)->ReleaseByteArrayElements(env, jsig, sig, JNI_ABORT);
		return 0;
	}
	ret = sm9_verify_finish(ctx, (const uint8_t *)sig, (size_t)siglen,
		mpk, (const char *)id, (size_t)idlen);
	(*env)->ReleaseByteArrayElements(env, jid, id, JNI_ABORT);
	(*env)->ReleaseByteArrayElements(env, jsig, sig, JNI_ABORT);
	return ret == 1 ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* 加密主密钥                                                          */
/* ------------------------------------------------------------------ */

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9EncMasterKeyGenerate(JNIEnv *env, jclass cls)
{
	SM9_ENC_MASTER_KEY *msk = (SM9_ENC_MASTER_KEY *)calloc(1, sizeof(SM9_ENC_MASTER_KEY));
	if (msk == NULL) {
		return 0;
	}
	if (sm9_enc_master_key_generate(msk) != 1) {
		memset(msk, 0, sizeof(SM9_ENC_MASTER_KEY));
		free(msk);
		return 0;
	}
	return PTR_HANDLE(msk);
}

JNIEXPORT void JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9EncMasterKeyFree(JNIEnv *env, jclass cls, jlong handle)
{
	SM9_ENC_MASTER_KEY *msk = HANDLE_PTR(SM9_ENC_MASTER_KEY, handle);
	if (msk != NULL) {
		memset(msk, 0, sizeof(SM9_ENC_MASTER_KEY));
		free(msk);
	}
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9EncMasterKeyInfoEncryptToPem0(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jpass, jbyteArray jfile)
{
	SM9_ENC_MASTER_KEY *msk = HANDLE_PTR(SM9_ENC_MASTER_KEY, handle);
	char *pass;
	size_t pass_length;
	FILE *fp;
	int ret;

	if (msk == NULL || jpass == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "wb");
	if (fp == NULL) {
		return 0;
	}
	pass = copy_c_string(env, jpass, &pass_length);
	if (pass == NULL) {
		fclose(fp);
		return 0;
	}
	ret = sm9_enc_master_key_info_encrypt_to_pem(msk, pass, fp);
	secure_free(pass, pass_length);
	fclose(fp);
	return ret == 1 ? 1 : 0;
}

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9EncMasterKeyInfoDecryptFromPem0(JNIEnv *env, jclass cls,
		jbyteArray jpass, jbyteArray jfile)
{
	SM9_ENC_MASTER_KEY *msk;
	char *pass;
	size_t pass_length;
	FILE *fp;
	int ret;

	if (jpass == NULL) {
		return 0;
	}
	msk = (SM9_ENC_MASTER_KEY *)calloc(1, sizeof(SM9_ENC_MASTER_KEY));
	if (msk == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "rb");
	if (fp == NULL) {
		memset(msk, 0, sizeof(SM9_ENC_MASTER_KEY));
		free(msk);
		return 0;
	}
	pass = copy_c_string(env, jpass, &pass_length);
	if (pass == NULL) {
		fclose(fp);
		memset(msk, 0, sizeof(SM9_ENC_MASTER_KEY));
		free(msk);
		return 0;
	}
	ret = master_key_info_decrypt_from_pem(msk, 0, pass, fp);
	secure_free(pass, pass_length);
	fclose(fp);
	if (ret != 1) {
		memset(msk, 0, sizeof(SM9_ENC_MASTER_KEY));
		free(msk);
		return 0;
	}
	return PTR_HANDLE(msk);
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9EncMasterPublicKeyToPem0(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jfile)
{
	SM9_ENC_MASTER_KEY *mpk = HANDLE_PTR(SM9_ENC_MASTER_KEY, handle);
	FILE *fp;
	int ret;

	if (mpk == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "wb");
	if (fp == NULL) {
		return 0;
	}
	ret = sm9_enc_master_public_key_to_pem(mpk, fp);
	fclose(fp);
	return ret == 1 ? 1 : 0;
}

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9EncMasterPublicKeyFromPem0(JNIEnv *env, jclass cls,
		jbyteArray jfile)
{
	SM9_ENC_MASTER_KEY *mpk;
	FILE *fp;
	int ret;

	mpk = (SM9_ENC_MASTER_KEY *)calloc(1, sizeof(SM9_ENC_MASTER_KEY));
	if (mpk == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "rb");
	if (fp == NULL) {
		free(mpk);
		return 0;
	}
	ret = sm9_enc_master_public_key_from_pem(mpk, fp);
	fclose(fp);
	if (ret != 1) {
		free(mpk);
		return 0;
	}
	return PTR_HANDLE(mpk);
}

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9EncMasterKeyExtractKey(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jid)
{
	SM9_ENC_MASTER_KEY *msk = HANDLE_PTR(SM9_ENC_MASTER_KEY, handle);
	SM9_ENC_KEY *key;
	jbyte *id;
	jsize idlen;
	int ret;

	if (msk == NULL || jid == NULL) {
		return 0;
	}
	key = (SM9_ENC_KEY *)calloc(1, sizeof(SM9_ENC_KEY));
	if (key == NULL) {
		return 0;
	}
	idlen = (*env)->GetArrayLength(env, jid);
	if (idlen <= 0) {
		memset(key, 0, sizeof(SM9_ENC_KEY));
		free(key);
		return 0;
	}
	id = (*env)->GetByteArrayElements(env, jid, NULL);
	if (id == NULL) {
		memset(key, 0, sizeof(SM9_ENC_KEY));
		free(key);
		return 0;
	}
	ret = sm9_enc_master_key_extract_key(msk, (const char *)id, (size_t)idlen, key);
	(*env)->ReleaseByteArrayElements(env, jid, id, JNI_ABORT);
	if (ret != 1) {
		memset(key, 0, sizeof(SM9_ENC_KEY));
		free(key);
		return 0;
	}
	return PTR_HANDLE(key);
}

/* ------------------------------------------------------------------ */
/* 用户解密私钥                                                        */
/* ------------------------------------------------------------------ */

JNIEXPORT void JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9EncKeyFree(JNIEnv *env, jclass cls, jlong handle)
{
	SM9_ENC_KEY *key = HANDLE_PTR(SM9_ENC_KEY, handle);
	if (key != NULL) {
		memset(key, 0, sizeof(SM9_ENC_KEY));
		free(key);
	}
}

JNIEXPORT jint JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9EncKeyInfoEncryptToPem0(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jpass, jbyteArray jfile)
{
	SM9_ENC_KEY *key = HANDLE_PTR(SM9_ENC_KEY, handle);
	char *pass;
	size_t pass_length;
	FILE *fp;
	int ret;

	if (key == NULL || jpass == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "wb");
	if (fp == NULL) {
		return 0;
	}
	pass = copy_c_string(env, jpass, &pass_length);
	if (pass == NULL) {
		fclose(fp);
		return 0;
	}
	ret = sm9_enc_key_info_encrypt_to_pem(key, pass, fp);
	secure_free(pass, pass_length);
	fclose(fp);
	return ret == 1 ? 1 : 0;
}

JNIEXPORT jlong JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9EncKeyInfoDecryptFromPem0(JNIEnv *env, jclass cls,
		jbyteArray jpass, jbyteArray jfile)
{
	SM9_ENC_KEY *key;
	char *pass;
	size_t pass_length;
	FILE *fp;
	int ret;

	if (jpass == NULL) {
		return 0;
	}
	key = (SM9_ENC_KEY *)calloc(1, sizeof(SM9_ENC_KEY));
	if (key == NULL) {
		return 0;
	}
	fp = open_file(env, jfile, "rb");
	if (fp == NULL) {
		memset(key, 0, sizeof(SM9_ENC_KEY));
		free(key);
		return 0;
	}
	pass = copy_c_string(env, jpass, &pass_length);
	if (pass == NULL) {
		fclose(fp);
		memset(key, 0, sizeof(SM9_ENC_KEY));
		free(key);
		return 0;
	}
	ret = sm9_enc_key_info_decrypt_from_pem(key, pass, fp);
	secure_free(pass, pass_length);
	fclose(fp);
	if (ret != 1) {
		memset(key, 0, sizeof(SM9_ENC_KEY));
		free(key);
		return 0;
	}
	return PTR_HANDLE(key);
}

/* ------------------------------------------------------------------ */
/* 加密 / 解密（IBE）                                                  */
/* ------------------------------------------------------------------ */

JNIEXPORT jbyteArray JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9Encrypt(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jid, jbyteArray jin)
{
	SM9_ENC_MASTER_KEY *mpk = HANDLE_PTR(SM9_ENC_MASTER_KEY, handle);
	jbyte *id;
	jsize idlen;
	jbyte *in;
	jsize inlen;
	uint8_t out[SM9_MAX_CIPHERTEXT_SIZE];
	size_t outlen = 0;
	int ret;
	jbyteArray result;

	if (mpk == NULL || jid == NULL || jin == NULL) {
		return NULL;
	}
	inlen = (*env)->GetArrayLength(env, jin);
	if (inlen <= 0 || inlen > SM9_MAX_PLAINTEXT_SIZE) {
		return NULL;
	}
	in = (*env)->GetByteArrayElements(env, jin, NULL);
	if (in == NULL) {
		return NULL;
	}
	idlen = (*env)->GetArrayLength(env, jid);
	if (idlen <= 0) {
		(*env)->ReleaseByteArrayElements(env, jin, in, JNI_ABORT);
		return NULL;
	}
	id = (*env)->GetByteArrayElements(env, jid, NULL);
	if (id == NULL) {
		(*env)->ReleaseByteArrayElements(env, jin, in, JNI_ABORT);
		return NULL;
	}
	ret = sm9_encrypt(mpk, (const char *)id, (size_t)idlen,
		(const uint8_t *)in, (size_t)inlen, out, &outlen);
	(*env)->ReleaseByteArrayElements(env, jid, id, JNI_ABORT);
	(*env)->ReleaseByteArrayElements(env, jin, in, JNI_ABORT);
	if (ret != 1) {
		return NULL;
	}
	result = (*env)->NewByteArray(env, (jsize)outlen);
	if (result == NULL) {
		return NULL;
	}
	(*env)->SetByteArrayRegion(env, result, 0, (jsize)outlen, (const jbyte *)out);
	return result;
}

JNIEXPORT jbyteArray JNICALL
Java_cn_gmkit_sm9_SM9NativeBridge_sm9Decrypt(JNIEnv *env, jclass cls,
		jlong handle, jbyteArray jid, jbyteArray jin)
{
	SM9_ENC_KEY *key = HANDLE_PTR(SM9_ENC_KEY, handle);
	jbyte *id;
	jsize idlen;
	jbyte *in;
	jsize inlen;
	uint8_t out[SM9_MAX_PLAINTEXT_SIZE];
	size_t required = 0;
	size_t outlen = 0;
	int ret;
	jbyteArray result;

	if (key == NULL || jid == NULL || jin == NULL) {
		return NULL;
	}
	inlen = (*env)->GetArrayLength(env, jin);
	if (inlen <= 0 || inlen > SM9_MAX_CIPHERTEXT_SIZE) {
		return NULL;
	}
	in = (*env)->GetByteArrayElements(env, jin, NULL);
	if (in == NULL) {
		return NULL;
	}
	idlen = (*env)->GetArrayLength(env, jid);
	if (idlen <= 0) {
		(*env)->ReleaseByteArrayElements(env, jin, in, JNI_ABORT);
		return NULL;
	}
	id = (*env)->GetByteArrayElements(env, jid, NULL);
	if (id == NULL) {
		(*env)->ReleaseByteArrayElements(env, jin, in, JNI_ABORT);
		return NULL;
	}
	/* GmSSL 支持 out=NULL 查询 C2 长度；先验证容量再写固定栈缓冲区。 */
	ret = sm9_decrypt(key, (const char *)id, (size_t)idlen,
		(const uint8_t *)in, (size_t)inlen, NULL, &required);
	if (ret == 1 && required > 0 && required <= sizeof(out)) {
		ret = sm9_decrypt(key, (const char *)id, (size_t)idlen,
			(const uint8_t *)in, (size_t)inlen, out, &outlen);
	} else {
		ret = 0;
	}
	(*env)->ReleaseByteArrayElements(env, jid, id, JNI_ABORT);
	(*env)->ReleaseByteArrayElements(env, jin, in, JNI_ABORT);
	if (ret != 1 || outlen != required) {
		secure_clear(out, sizeof(out));
		return NULL;
	}
	result = (*env)->NewByteArray(env, (jsize)outlen);
	if (result == NULL) {
		secure_clear(out, sizeof(out));
		return NULL;
	}
	(*env)->SetByteArrayRegion(env, result, 0, (jsize)outlen, (const jbyte *)out);
	secure_clear(out, sizeof(out));
	return result;
}
