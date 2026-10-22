param(
 [Parameter(Mandatory=$true)][string]$Directory,
 [ValidateRange(1,391)][int]$Samples=271,
 [ValidateRange(1,10)][int]$IntervalSeconds=10,
 [ValidateSet(2700,3900)][int]$MaximumSeconds=2700
)
$ErrorActionPreference='Stop'
if($Samples -gt 271 -and $MaximumSeconds -ne 3900){throw 'Wide channel requires the named finite duration'}
$repoRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskRoot=[IO.Path]::GetFullPath((Join-Path $repoRoot '..'))
$memoryDirectory=[IO.Path]::GetFullPath($Directory)
if(-not $memoryDirectory.StartsWith($taskRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $memoryDirectory.Equals($repoRoot,[StringComparison]::OrdinalIgnoreCase) -or $memoryDirectory.StartsWith($repoRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Monitor output must be inside this task and outside repository'}
if(-not (Test-Path -LiteralPath $memoryDirectory -PathType Container)){throw 'Create the explicit monitor directory first'}
$temporary=Join-Path $memoryDirectory 'windows-memory-current.tmp'
$timeline=Join-Path $memoryDirectory 'windows-memory.jsonl'
$stop=Join-Path $memoryDirectory 'windows-memory.stop'
if((Get-ChildItem -LiteralPath $memoryDirectory -Filter 'windows-memory-sample-*').Count -gt 0 -or (Test-Path -LiteralPath $temporary) -or (Test-Path -LiteralPath $timeline) -or (Test-Path -LiteralPath $stop)){throw 'Use a fresh monitor directory'}
$encoding=New-Object Text.UTF8Encoding($false)
$elapsed=[Diagnostics.Stopwatch]::StartNew()
Write-Output 'Finite read-only Windows RAM monitor started'
for($sample=0;$sample -lt $Samples;$sample++){
 if((Test-Path -LiteralPath $stop) -or $elapsed.Elapsed.TotalSeconds -ge $MaximumSeconds){break}
 $memory=Get-CimInstance -ClassName Win32_OperatingSystem -OperationTimeoutSec 5
 $row=[ordered]@{checkedAt=[DateTime]::UtcNow.ToString('o');host='LLM-01';source='Win32_OperatingSystem';availableMiB=[Math]::Round($memory.FreePhysicalMemory/1024,2);totalMiB=[Math]::Round($memory.TotalVisibleMemorySize/1024,2)}
 $json=($row|ConvertTo-Json -Compress)+"`n"
 [IO.File]::WriteAllText($temporary,$json,$encoding)
 $sampleFile=Join-Path $memoryDirectory ('windows-memory-sample-{0:D4}.json' -f $sample)
 [IO.File]::Move($temporary,$sampleFile)
 [IO.File]::AppendAllText($timeline,$json,$encoding)
 if($sample%30 -eq 0){Write-Output ("Sample "+$sample+" availableMiB="+$row.availableMiB)}
 $remaining=$MaximumSeconds*1000-$elapsed.Elapsed.TotalMilliseconds
 if($sample+1 -lt $Samples -and $remaining -gt 0){Start-Sleep -Milliseconds ([int][Math]::Min($IntervalSeconds*1000,[Math]::Floor($remaining)))}
}
Write-Output 'Finite Windows RAM monitor stopped'
