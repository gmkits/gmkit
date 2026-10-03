$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'sm9-native.ps1'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw "native 脚本语法错误：$parseErrors" }

# 通过 PowerShell AST 取真实函数/打包分支，替换外部命令；不克隆或编译 native。
foreach ($name in @('Write-RuntimeManifest', 'Assert-PackagedRuntime')) {
    $definition = $ast.Find({ param($node)
        $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name
    }, $false)
    if ($null -eq $definition) { throw "缺少待验证函数：$name" }
    . ([scriptblock]::Create($definition.Extent.Text))
}
$packageBlock = $ast.Find({ param($node)
    $node -is [System.Management.Automation.Language.IfStatementAst] -and
    $node.Clauses[0].Item1.Extent.Text -eq '$PackageRuntime'
}, $false)
if ($null -eq $packageBlock) { throw '缺少 PackageRuntime 分支' }

function Invoke-External {
    param([string]$File, [string[]]$Arguments)
    if ($Arguments -notcontains '-Prelease' -or ($Arguments -join ' ') -match 'sm9-runtime-bundle') {
        throw '单平台打包不得启用五平台 bundle profile'
    }
    $script:packageInvoked = $true
}

$temporary = Join-Path ([System.IO.Path]::GetTempPath()) ('gmkit-native-contract-' + [guid]::NewGuid())
$resolvedTemporary = [System.IO.Path]::GetFullPath($temporary)
$resolvedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
if (-not $resolvedTemporary.StartsWith($resolvedTempRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw '测试目录不在临时目录内'
}
New-Item -ItemType Directory -Path $temporary | Out-Null
try {
    $javaRoot = $temporary
    $resourceRoot = Join-Path $temporary 'resources'
    $platformId = 'linux-x86_64'
    $nativeInfo = @{ Bridge = 'libgmkitsm9.so'; Gmssl = 'libgmssl.so.3' }
    $GmsslRef = 'fixture-commit'
    $native = Join-Path $resourceRoot "native/$platformId"
    New-Item -ItemType Directory -Force -Path $native | Out-Null
    foreach ($file in @($nativeInfo.Bridge, $nativeInfo.Gmssl)) {
        [IO.File]::WriteAllText((Join-Path $native $file), "fixture:$file")
    }
    Write-RuntimeManifest $resourceRoot
    $manifest = Get-Content -LiteralPath (Join-Path $resourceRoot 'META-INF/gmkit/sm9-native.sha256')
    foreach ($file in @($nativeInfo.Bridge, $nativeInfo.Gmssl)) {
        $hash = (Get-FileHash -LiteralPath (Join-Path $native $file) -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($manifest -notcontains "$hash  native/$platformId/$file") { throw "资源路径或摘要错误：$file" }
    }
    $target = Join-Path $javaRoot 'gmkit-sm9/target'
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    [IO.File]::WriteAllText((Join-Path $javaRoot 'pom.xml'), '<project><version>0.0.0</version></project>')
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $jar = Join-Path $target 'gmkit-sm9-0.0.0.jar'
    [IO.Compression.ZipFile]::CreateFromDirectory($resourceRoot, $jar)
    $Stage = $true
    $PackageRuntime = $true
    $Maven = 'unused-maven'
    $script:packageInvoked = $false
    . ([scriptblock]::Create($packageBlock.Extent.Text))
    if (-not $script:packageInvoked) { throw '未验证单平台打包命令' }
    $zip = [IO.Compression.ZipFile]::Open($jar, [IO.Compression.ZipArchiveMode]::Update)
    try { $zip.GetEntry("native/$platformId/$($nativeInfo.Gmssl)").Delete() } finally { $zip.Dispose() }
    $rejected = $false
    try { Assert-PackagedRuntime $jar $platformId $nativeInfo } catch { $rejected = $true }
    if (-not $rejected) { throw '缺少动态库的 JAR 未被拒绝' }
    Write-Host 'SM9 single-platform packaging contract passed (fixture only, no native evidence)'
} finally {
    Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
}
