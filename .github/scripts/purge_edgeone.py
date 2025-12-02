#!/usr/bin/env python3
"""
EdgeOne CDN Cache Purge Script
Supports both domestic (China) and international EdgeOne deployments
"""

import json
import sys
import hmac
import hashlib
import time
from datetime import datetime
import urllib.request
import urllib.error


def get_string_to_sign(timestamp, credential_scope, hashed_canonical_request):
    """Generate the string to sign"""
    return "\n".join([
        "TC3-HMAC-SHA256",
        str(timestamp),
        credential_scope,
        hashed_canonical_request
    ])


def sign(key, msg):
    """HMAC-SHA256 signing"""
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def get_signature(secret_key, date, service, string_to_sign):
    """Generate signature"""
    secret_date = sign(("TC3" + secret_key).encode("utf-8"), date)
    secret_service = sign(secret_date, service)
    secret_signing = sign(secret_service, "tc3_request")
    signature = hmac.new(secret_signing, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    return signature


def purge_edgeone_cache(secret_id, secret_key, zone_id, targets, purge_type="purge_host", is_international=False):
    """
    Purge EdgeOne CDN cache
    
    Args:
        secret_id: Tencent Cloud Secret ID
        secret_key: Tencent Cloud Secret Key
        zone_id: EdgeOne Zone ID
        targets: List of targets to purge (domains for purge_host)
        purge_type: Type of purge operation (purge_host, purge_url, purge_prefix)
        is_international: True for international site, False for domestic
    """
    # Configure endpoint based on site type
    if is_international:
        endpoint = "teo.intl.tencentcloudapi.com"
    else:
        endpoint = "teo.tencentcloudapi.com"
    
    service = "teo"
    action = "CreatePurgeTask"
    version = "2022-09-01"
    region = "ap-guangzhou"
    
    # Request payload
    payload = {
        "ZoneId": zone_id,
        "Type": purge_type,
        "Targets": targets
    }
    
    payload_json = json.dumps(payload)
    
    # Get timestamp
    timestamp = int(time.time())
    date = datetime.utcfromtimestamp(timestamp).strftime("%Y-%m-%d")
    
    # Step 1: Build canonical request
    http_request_method = "POST"
    canonical_uri = "/"
    canonical_querystring = ""
    canonical_headers = f"content-type:application/json; charset=utf-8\nhost:{endpoint}\nx-tc-action:{action.lower()}\n"
    signed_headers = "content-type;host;x-tc-action"
    hashed_request_payload = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()
    
    canonical_request = "\n".join([
        http_request_method,
        canonical_uri,
        canonical_querystring,
        canonical_headers,
        signed_headers,
        hashed_request_payload
    ])
    
    # Step 2: Build string to sign
    hashed_canonical_request = hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()
    credential_scope = f"{date}/{service}/tc3_request"
    string_to_sign = get_string_to_sign(timestamp, credential_scope, hashed_canonical_request)
    
    # Step 3: Calculate signature
    signature = get_signature(secret_key, date, service, string_to_sign)
    
    # Step 4: Build authorization header
    authorization = f"TC3-HMAC-SHA256 Credential={secret_id}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"
    
    # Build headers
    headers = {
        "Authorization": authorization,
        "Content-Type": "application/json; charset=utf-8",
        "Host": endpoint,
        "X-TC-Action": action,
        "X-TC-Timestamp": str(timestamp),
        "X-TC-Version": version,
        "X-TC-Region": region
    }
    
    # Make request
    url = f"https://{endpoint}/"
    req = urllib.request.Request(url, data=payload_json.encode("utf-8"), headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            response_data = response.read().decode("utf-8")
            result = json.loads(response_data)
            
            if "Response" in result:
                if "Error" in result["Response"]:
                    error = result["Response"]["Error"]
                    print(f"❌ API Error: [{error['Code']}] {error['Message']}", file=sys.stderr)
                    return False
                else:
                    print(f"✅ Cache purge successful!")
                    print(f"   JobId: {result['Response'].get('JobId', 'N/A')}")
                    print(f"   RequestId: {result['Response'].get('RequestId', 'N/A')}")
                    
                    if result["Response"].get("FailedList"):
                        print(f"⚠️  Failed targets: {result['Response']['FailedList']}", file=sys.stderr)
                    
                    return True
            else:
                print(f"❌ Unexpected response format: {result}", file=sys.stderr)
                return False
                
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"❌ HTTP Error {e.code}: {error_body}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}", file=sys.stderr)
        return False


def main():
    """Main entry point"""
    if len(sys.argv) < 5:
        print("Usage: python purge_edgeone.py <secret_id> <secret_key> <zone_id> <target> [--international]")
        print("Example (Domestic): python purge_edgeone.py <id> <key> zone-xxx gmkit.cn")
        print("Example (International): python purge_edgeone.py <id> <key> zone-yyy gmkit.com --international")
        sys.exit(1)
    
    secret_id = sys.argv[1]
    secret_key = sys.argv[2]
    zone_id = sys.argv[3]
    target = sys.argv[4]
    is_international = "--international" in sys.argv
    
    site_type = "International" if is_international else "Domestic"
    print(f"🚀 Purging EdgeOne CDN cache for {site_type} site...")
    print(f"   Zone ID: {zone_id}")
    print(f"   Target: {target}")
    
    success = purge_edgeone_cache(
        secret_id=secret_id,
        secret_key=secret_key,
        zone_id=zone_id,
        targets=[target],
        purge_type="purge_host",
        is_international=is_international
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
