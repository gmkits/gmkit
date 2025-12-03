#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EdgeOne CDN Cache Purge Script
腾讯云 EdgeOne CDN 缓存刷新脚本

Supports both domestic (China) and international EdgeOne deployments
支持国内站和国际站的 EdgeOne 部署

Based on Tencent Cloud API v3 signature implementation
基于腾讯云 API 签名 v3 实现
Reference: https://cloud.tencent.com/document/product/213/30654
"""

import hashlib
import hmac
import json
import sys
import time
from datetime import datetime

if sys.version_info[0] <= 2:
    from httplib import HTTPSConnection
else:
    from http.client import HTTPSConnection


def sign(key, msg):
    """
    HMAC-SHA256 signing function
    HMAC-SHA256 签名函数
    """
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def purge_edgeone_cache(secret_id, secret_key, zone_id, targets, purge_type="purge_host", site_type="cn"):
    """
    Purge EdgeOne CDN cache
    刷新 EdgeOne CDN 缓存
    
    Args:
        secret_id: Tencent Cloud Secret ID (腾讯云密钥 ID)
        secret_key: Tencent Cloud Secret Key (腾讯云密钥 Key)
        zone_id: EdgeOne Zone ID (站点 ID)
        targets: List of targets to purge (刷新目标列表)
        purge_type: Type of purge operation (刷新类型: purge_host, purge_url, purge_prefix)
        site_type: Site type - "cn" for domestic, "intl" for international
                   (站点类型 - "cn" 表示国内站，"intl" 表示国际站)
    """
    # Configure variables based on site type
    # 根据站点类型配置变量
    if site_type == "intl":
        # International site configuration (国际站配置)
        host = "teo.intl.tencentcloudapi.com"
    else:
        # Domestic site configuration (国内站配置)
        host = "teo.tencentcloudapi.com"
    
    # Common API parameters (通用 API 参数)
    service = "teo"
    action = "CreatePurgeTask"
    version = "2022-09-01"
    algorithm = "TC3-HMAC-SHA256"
    
    # Build request payload (构建请求载荷)
    payload = json.dumps({
        "ZoneId": zone_id,
        "Type": purge_type,
        "Targets": targets
    })
    
    # Get timestamp and date (获取时间戳和日期)
    timestamp = int(time.time())
    date = datetime.utcfromtimestamp(timestamp).strftime("%Y-%m-%d")
    
    # ************* Step 1: Build canonical request (步骤 1：拼接规范请求串) *************
    http_request_method = "POST"
    canonical_uri = "/"
    canonical_querystring = ""
    ct = "application/json; charset=utf-8"
    canonical_headers = "content-type:%s\nhost:%s\nx-tc-action:%s\n" % (ct, host, action.lower())
    signed_headers = "content-type;host;x-tc-action"
    hashed_request_payload = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    canonical_request = (http_request_method + "\n" +
                        canonical_uri + "\n" +
                        canonical_querystring + "\n" +
                        canonical_headers + "\n" +
                        signed_headers + "\n" +
                        hashed_request_payload)
    
    # ************* Step 2: Build string to sign (步骤 2：拼接待签名字符串) *************
    credential_scope = date + "/" + service + "/" + "tc3_request"
    hashed_canonical_request = hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()
    string_to_sign = (algorithm + "\n" +
                     str(timestamp) + "\n" +
                     credential_scope + "\n" +
                     hashed_canonical_request)
    
    # ************* Step 3: Calculate signature (步骤 3：计算签名) *************
    secret_date = sign(("TC3" + secret_key).encode("utf-8"), date)
    secret_service = sign(secret_date, service)
    secret_signing = sign(secret_service, "tc3_request")
    signature = hmac.new(secret_signing, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    
    # ************* Step 4: Build Authorization header (步骤 4：拼接 Authorization) *************
    authorization = (algorithm + " " +
                    "Credential=" + secret_id + "/" + credential_scope + ", " +
                    "SignedHeaders=" + signed_headers + ", " +
                    "Signature=" + signature)
    
    # ************* Step 5: Construct and send request (步骤 5：构造并发起请求) *************
    # Note: X-TC-Region header is not required for EdgeOne API
    # 注意：EdgeOne API 不需要 X-TC-Region 头
    headers = {
        "Authorization": authorization,
        "Content-Type": ct,
        "Host": host,
        "X-TC-Action": action,
        "X-TC-Timestamp": str(timestamp),
        "X-TC-Version": version
    }
    
    try:
        conn = HTTPSConnection(host)
        conn.request("POST", "/", headers=headers, body=payload.encode("utf-8"))
        response = conn.getresponse()
        response_data = response.read().decode("utf-8")
        result = json.loads(response_data)
        
        if "Response" in result:
            if "Error" in result["Response"]:
                error = result["Response"]["Error"]
                print("❌ API Error: [%s] %s" % (error["Code"], error["Message"]), file=sys.stderr)
                return False
            else:
                print("✅ Cache purge successful!")
                print("   JobId: %s" % result["Response"].get("JobId", "N/A"))
                print("   RequestId: %s" % result["Response"].get("RequestId", "N/A"))
                
                if result["Response"].get("FailedList"):
                    print("⚠️  Failed targets: %s" % result["Response"]["FailedList"], file=sys.stderr)
                
                return True
        else:
            print("❌ Unexpected response format: %s" % result, file=sys.stderr)
            return False
            
    except Exception as err:
        print("❌ Error: %s" % str(err), file=sys.stderr)
        return False
    finally:
        if 'conn' in locals():
            conn.close()


def main():
    """Main entry point (主入口)"""
    if len(sys.argv) < 5:
        print("Usage: python purge_edgeone.py <secret_id> <secret_key> <zone_id> <targets> [--site-type=cn|intl]")
        print("")
        print("Arguments:")
        print("  secret_id   : Tencent Cloud Secret ID")
        print("  secret_key  : Tencent Cloud Secret Key")
        print("  zone_id     : EdgeOne Zone ID")
        print("  targets     : Comma-separated list of targets (e.g., 'gmkit.cn,www.gmkit.cn')")
        print("  --site-type : Site type - 'cn' for domestic (default), 'intl' for international")
        print("")
        print("Examples:")
        print("  Domestic (CN):      python purge_edgeone.py <id> <key> zone-xxx 'gmkit.cn'")
        print("  Domestic (CN):      python purge_edgeone.py <id> <key> zone-xxx 'gmkit.cn,www.gmkit.cn' --site-type=cn")
        print("  International:      python purge_edgeone.py <id> <key> zone-yyy 'gmkit.com' --site-type=intl")
        print("  International:      python purge_edgeone.py <id> <key> zone-yyy 'gmkit.com,www.gmkit.com' --site-type=intl")
        sys.exit(1)
    
    secret_id = sys.argv[1]
    secret_key = sys.argv[2]
    zone_id = sys.argv[3]
    targets_str = sys.argv[4]
    
    # Parse site type from arguments (从参数解析站点类型)
    site_type = "cn"  # Default to domestic (默认国内站)
    for arg in sys.argv[5:]:
        if arg.startswith("--site-type="):
            site_type = arg.split("=")[1]
    
    # Validate site type (验证站点类型)
    if site_type not in ["cn", "intl"]:
        print("❌ Error: Invalid site type '%s'. Must be 'cn' or 'intl'" % site_type, file=sys.stderr)
        sys.exit(1)
    
    # Parse targets - support comma-separated list (解析目标 - 支持逗号分隔列表)
    targets = [t.strip() for t in targets_str.split(",") if t.strip()]
    
    if not targets:
        print("❌ Error: No valid targets specified", file=sys.stderr)
        sys.exit(1)
    
    site_name = "International (国际站)" if site_type == "intl" else "Domestic (国内站)"
    print("🚀 Purging EdgeOne CDN cache for %s..." % site_name)
    print("   Zone ID: %s" % zone_id)
    print("   Targets: %s" % ", ".join(targets))
    print("   Site Type: %s" % site_type)
    
    success = purge_edgeone_cache(
        secret_id=secret_id,
        secret_key=secret_key,
        zone_id=zone_id,
        targets=targets,
        purge_type="purge_host",
        site_type=site_type
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
