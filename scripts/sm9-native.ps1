param(
    [ValidateSet('current', 'linux-x86_64', 'linux-aarch64', 'darwin-x86_64', 'darwin-aarch64', 'windows-x86_64')]
    [string]$Platform = 'current',
    [string]$GmsslRef = $(if ($env:GMSSL_REF) { $env:GMSSL_REF } else { 'd655c06b3a6b0fe8cff900f293bf0e5aac6eb0a2' }),
    [string]$BuildRoot = '',
    [string]$Configuration = 'Release',
    [string]$Generator = '',
    [string]$CMake = 'cmake',
    [string]$CTest = 'ctest',
    [string]$Maven = 'mvn',
    [switch]$Clean,
    [switch]$Stage,
    [switch]$PackageRuntime,
    [switch]$Test
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "缺少命令 $Name。SM9 native 需要 Git、CMake、可用 C 编译器、JDK 与 Maven。"
    }
}

function Invoke-External {
    param(
        [string]$File,
        [string[]]$Arguments
    )

    $display = "$File $($Arguments -join ' ')"
    Write-Host "==> $display"
    & $File @Arguments 2>&1 | Write-Host
    if ($LASTEXITCODE -ne 0) {
        throw "命令失败：$display"
    }
}

function Get-CurrentPlatform {
    $os = [System.Runtime.InteropServices.RuntimeInformation]::OSDescription.ToLowerInvariant()
    if ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)) {
        $osToken = 'windows'
    } elseif ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::OSX) -or $os.Contains('darwin')) {
        $osToken = 'darwin'
    } elseif ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)) {
        $osToken = 'linux'
    } else {
        throw "当前操作系统暂不支持 SM9 native 自动构建：$os"
    }

    $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
    if ($arch -in @('x64', 'x86_64', 'amd64')) {
        $archToken = 'x86_64'
    } elseif ($arch -in @('arm64', 'aarch64')) {
        $archToken = 'aarch64'
    } else {
        throw "当前 CPU 架构暂不支持 SM9 native 自动构建：$arch"
    }

    return "$osToken-$archToken"
}

function Get-NativeInfo {
    param([string]$PlatformId)
    switch ($PlatformId) {
        'linux-x86_64' {
            return @{
                Bridge = 'libgmkitsm9.so'
                Gmssl = 'libgmssl.so.3'
            }
        }
        'linux-aarch64' {
            return @{
                Bridge = 'libgmkitsm9.so'
                Gmssl = 'libgmssl.so.3'
            }
        }
        'darwin-x86_64' {
            return @{
                Bridge = 'libgmkitsm9.dylib'
                Gmssl = 'libgmssl.3.dylib'
            }
        }
        'darwin-aarch64' {
            return @{
                Bridge = 'libgmkitsm9.dylib'
                Gmssl = 'libgmssl.3.dylib'
            }
        }
        'windows-x86_64' {
            return @{
                Bridge = 'gmkitsm9.dll'
                Gmssl = 'gmssl.dll'
            }
        }
        default {
            throw "未知 SM9 native 平台：$PlatformId"
        }
    }
}

function Find-RequiredFile {
    param(
        [string[]]$Roots,
        [string]$FileName
    )

    foreach ($root in $Roots) {
        if (-not (Test-Path -LiteralPath $root)) {
            continue
        }
        $match = Get-ChildItem -LiteralPath $root -Recurse -File -Filter $FileName -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($match) {
            return $match.FullName
        }
    }
    throw "找不到构建产物：$FileName"
}

function Copy-MatchingFiles {
    param(
        [string[]]$Roots,
        [string[]]$Patterns,
        [string]$Destination
    )

    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    foreach ($root in $Roots) {
        if (-not (Test-Path -LiteralPath $root)) {
            continue
        }
        foreach ($pattern in $Patterns) {
            Get-ChildItem -LiteralPath $root -Recurse -File -Filter $pattern -ErrorAction SilentlyContinue |
                ForEach-Object {
                    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Destination $_.Name) -Force
                }
        }
    }
}

function New-GmsslRoot {
    param(
        [string]$SourceDir,
        [string]$BuildDir,
        [string]$RootDir,
        [string]$PlatformId,
        [hashtable]$NativeInfo
    )

    if (Test-Path -LiteralPath $RootDir) {
        Remove-Item -LiteralPath $RootDir -Recurse -Force
    }

    $includeSrc = Join-Path $SourceDir 'include/gmssl'
    $includeDst = Join-Path $RootDir 'include/gmssl'
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $includeDst) | Out-Null
    Copy-Item -LiteralPath $includeSrc -Destination $includeDst -Recurse -Force

    $libDir = Join-Path $RootDir 'lib'
    $binDir = Join-Path $RootDir 'bin'

    # JNI CMake 需要 include + 可链接的 gmssl 库。Windows 下额外复制 import lib。
    Copy-MatchingFiles @($BuildDir) @('libgmssl.so', 'libgmssl.so.*', 'libgmssl.*.dylib', 'libgmssl.dylib', 'gmssl.lib', 'libgmssl.dll.a') $libDir
    Copy-MatchingFiles @($BuildDir) @('gmssl.dll', 'libgmssl.so', 'libgmssl.so.*', 'libgmssl.*.dylib', 'libgmssl.dylib') $binDir

    $gmsslRuntime = Find-RequiredFile @($RootDir, $BuildDir) $NativeInfo.Gmssl

    if ($PlatformId -eq 'windows-x86_64') {
        $importLib = Get-ChildItem -LiteralPath $RootDir -Recurse -File -Include 'gmssl.lib', 'libgmssl.dll.a' -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if (-not $importLib) {
            throw "Windows JNI 编译需要 GmSSL import lib（gmssl.lib 或 libgmssl.dll.a），当前只找到了 $gmsslRuntime"
        }
    }

    return $RootDir
}

function Write-RuntimeManifest {
    param([string]$ResourceRoot)

    function Get-RelativeResourcePath {
        param([string]$BasePath, [string]$FilePath)
        $baseUri = New-Object System.Uri(($BasePath.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar))
        $fileUri = New-Object System.Uri($FilePath)
        return [Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fileUri).ToString())
    }

    $nativeRoot = Join-Path $ResourceRoot 'native'
    $metadataDir = Join-Path $ResourceRoot 'META-INF/gmkit'
    $nativeFiles = @(Get-ChildItem -LiteralPath $nativeRoot -Recurse -File -ErrorAction Stop |
        Sort-Object FullName
    )
    if ($nativeFiles.Count -eq 0) {
        throw "没有可写入清单的 native 文件：$nativeRoot"
    }

    $hashLines = foreach ($file in $nativeFiles) {
        $relative = Get-RelativeResourcePath $ResourceRoot $file.FullName
        $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        "$hash  $relative"
    }
    $platforms = $nativeFiles |
        ForEach-Object { Get-RelativeResourcePath $nativeRoot $_.Directory.FullName } |
        Sort-Object -Unique
    $properties = @(
        'bundle.format=1'
        'gmssl.version=3.1.1'
        "gmssl.commit=$GmsslRef"
        "platforms=$($platforms -join ',')"
        ''
    ) -join "`n"
    $manifest = ($hashLines | Sort-Object) -join "`n"
    New-Item -ItemType Directory -Force -Path $metadataDir | Out-Null
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Join-Path $metadataDir 'sm9-native.properties'), $properties, $utf8)
    [System.IO.File]::WriteAllText((Join-Path $metadataDir 'sm9-native.sha256'), "$manifest`n", $utf8)
}

function Assert-PackagedRuntime {
    param([string]$Jar, [string]$PlatformId, [hashtable]$NativeInfo)
    # 单平台构建只核对当前平台；五平台完整性仍由聚合作业的 bundle profile 强制检查。
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($Jar)
    try {
        foreach ($resource in @(
            "native/$PlatformId/$($NativeInfo.Bridge)",
            "native/$PlatformId/$($NativeInfo.Gmssl)",
            'META-INF/gmkit/sm9-native.sha256',
            'META-INF/gmkit/sm9-native.properties'
        )) {
            $entry = $archive.GetEntry($resource)
            if ($null -eq $entry -or $entry.Length -eq 0) { throw "打包缺少 runtime 资源：$resource" }
        }
    } finally {
        $archive.Dispose()
    }
}

$repoRoot = Resolve-RepoRoot
$javaRoot = Join-Path $repoRoot 'packages/java'
$platformId = if ($Platform -eq 'current') { Get-CurrentPlatform } else { $Platform }
$nativeInfo = Get-NativeInfo $platformId

if (-not $BuildRoot) {
    $BuildRoot = Join-Path $javaRoot "target/sm9-native/$platformId"
}
$BuildRoot = [System.IO.Path]::GetFullPath($BuildRoot)

$gmsslSource = Join-Path $BuildRoot 'gmssl-src'
$gmsslBuild = Join-Path $BuildRoot 'gmssl-build'
$gmsslRoot = Join-Path $BuildRoot 'gmssl-root'
$runtimeDir = Join-Path $BuildRoot 'runtime'
$jniBuild = Join-Path $javaRoot 'gmkit-sm9/target/native-build'

Write-Host "SM9 native platform : $platformId"
Write-Host "GmSSL ref           : $GmsslRef"
Write-Host "Build root          : $BuildRoot"

Require-Command git
Require-Command $CMake
Require-Command $Maven
if ($Test) {
    Require-Command $CTest
}

if ($Clean -and (Test-Path -LiteralPath $BuildRoot)) {
    Write-Host "==> 清理 $BuildRoot"
    Remove-Item -LiteralPath $BuildRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $BuildRoot | Out-Null

if (-not (Test-Path -LiteralPath $gmsslSource)) {
    # `git clone --branch` 不接受 commit SHA；初始化后 fetch 可统一处理 SHA、tag 和 branch。
    Invoke-External git @('init', $gmsslSource)
    Invoke-External git @('-C', $gmsslSource, 'remote', 'add', 'origin', 'https://github.com/guanzhi/GmSSL.git')
}
Invoke-External git @('-C', $gmsslSource, 'fetch', '--depth', '1', 'origin', $GmsslRef)
Invoke-External git @('-C', $gmsslSource, 'checkout', '--detach', 'FETCH_HEAD')

$configureArgs = @(
    '-S', $gmsslSource,
    '-B', $gmsslBuild,
    "-DCMAKE_BUILD_TYPE=$Configuration",
    '-DBUILD_SHARED_LIBS=ON'
)

if ($Generator) {
    $configureArgs += @('-G', $Generator)
}

# Windows 下 release runtime 必须是 x64；Visual Studio 生成器需要显式 -A x64。
if ($platformId -eq 'windows-x86_64') {
    $usesVisualStudio = $Generator -match 'Visual Studio' -or (-not $Generator -and (-not $env:CMAKE_GENERATOR -or $env:CMAKE_GENERATOR -match 'Visual Studio'))
    if ($usesVisualStudio) {
        $configureArgs += @('-A', 'x64')
    }
}

Invoke-External $CMake $configureArgs
Invoke-External $CMake @('--build', $gmsslBuild, '--config', $Configuration, '--parallel', '2')

$gmsslRootForJni = New-GmsslRoot $gmsslSource $gmsslBuild $gmsslRoot $platformId $nativeInfo

if (Test-Path -LiteralPath $jniBuild) {
    Remove-Item -LiteralPath $jniBuild -Recurse -Force
}

# Maven 的 native-build profile 内部也会调用 CMake。Windows/MSVC 下这里必须继续指定 x64，
# 否则 GmSSL import lib 与 JNI bridge 可能一个是 x64、一个是 Win32。
if ($Generator) {
    $env:CMAKE_GENERATOR = $Generator
}
if ($platformId -eq 'windows-x86_64' -and $usesVisualStudio) {
    $env:CMAKE_GENERATOR_PLATFORM = 'x64'
}

$mavenBuildArgs = @(
    '-f', (Join-Path $javaRoot 'pom.xml'),
    '-B',
    '-ntp',
    '-pl', 'gmkit-sm9',
    '-Pnative-build',
    "-Dgmssl.root=$gmsslRootForJni",
    "-Dcmake.build.type=$Configuration"
)

if ($Generator) {
    $mavenBuildArgs += "-Dcmake.generator=$Generator"
}
if ($platformId -eq 'windows-x86_64' -and $usesVisualStudio) {
    $mavenBuildArgs += '-Dcmake.generator.platform=x64'
}
$mavenBuildArgs += 'process-classes'

Invoke-External $Maven $mavenBuildArgs

$bridgePath = Find-RequiredFile @($jniBuild) $nativeInfo.Bridge
$gmsslPath = Find-RequiredFile @($gmsslRootForJni, $gmsslBuild) $nativeInfo.Gmssl

# 测试和打包都使用同目录的 bridge + gmssl，避免 Windows/Linux 动态库搜索路径差异。
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
Copy-Item -LiteralPath $bridgePath -Destination (Join-Path $runtimeDir $nativeInfo.Bridge) -Force
Copy-Item -LiteralPath $gmsslPath -Destination (Join-Path $runtimeDir $nativeInfo.Gmssl) -Force

if ($Stage) {
    # 二进制属于构建产物，写入 target 后由 Maven 作为生成资源打入 gmkit-sm9 JAR。
    $stageDir = Join-Path $javaRoot "gmkit-sm9/target/generated-resources/sm9-runtime/native/$platformId"
    New-Item -ItemType Directory -Force -Path $stageDir | Out-Null
    Copy-Item -LiteralPath (Join-Path $runtimeDir $nativeInfo.Bridge) -Destination (Join-Path $stageDir $nativeInfo.Bridge) -Force
    Copy-Item -LiteralPath (Join-Path $runtimeDir $nativeInfo.Gmssl) -Destination (Join-Path $stageDir $nativeInfo.Gmssl) -Force
    # loader 在 JAR fallback 前会校验当前平台文件；每次 Stage 都重建清单，避免旧哈希残留。
    Write-RuntimeManifest (Join-Path $javaRoot 'gmkit-sm9/target/generated-resources/sm9-runtime')
    Write-Host "==> 已填充 gmkit-sm9 runtime：$stageDir"
}

if ($PackageRuntime) {
    if (-not $Stage) {
        throw '-PackageRuntime 需要同时指定 -Stage，确保 runtime 模块内已有 native 资源。'
    }
    Invoke-External $Maven @(
        '-f', (Join-Path $javaRoot 'pom.xml'),
        '-B',
        '-ntp',
        '-Prelease',
        '-pl', 'gmkit-sm9',
        '-Dgpg.skip=true',
        '-DskipTests',
        'package'
    )
    $version = ([xml](Get-Content -LiteralPath (Join-Path $javaRoot 'pom.xml') -Raw)).project.version
    Assert-PackagedRuntime (Join-Path $javaRoot "gmkit-sm9/target/gmkit-sm9-$version.jar") $platformId $nativeInfo
}

if ($Test) {
    # GmSSL 的 sm9 用例执行固定的 ks/ds/ke/de 派生向量。先验证上游实现，
    # 再运行 JNI 层测试，避免“测试程序已编译但从未执行”的假阳性。
    Invoke-External $CTest @(
        '--test-dir', $gmsslBuild,
        '--build-config', $Configuration,
        '--output-on-failure',
        '--no-tests=error',
        '-R', '^sm9$'
    )

    $testBridge = Join-Path $runtimeDir $nativeInfo.Bridge
    Invoke-External $Maven @(
        '-f', (Join-Path $javaRoot 'pom.xml'),
        '-B',
        '-ntp',
        '-pl', 'gmkit-sm9',
        '-Dgmkit.sm9.requireNative=true',
        "-Dgmkit.sm9.native.path=$testBridge",
        'test'
    )
}

Write-Host "==> SM9 native 构建完成"
Write-Host "Bridge: $(Join-Path $runtimeDir $nativeInfo.Bridge)"
Write-Host "GmSSL : $(Join-Path $runtimeDir $nativeInfo.Gmssl)"
