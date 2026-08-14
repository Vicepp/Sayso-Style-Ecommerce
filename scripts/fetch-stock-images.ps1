<#
  fetch-stock-images.ps1

  Downloads the placeholder photography this theme ships with into /assets.
  Every photo comes from Unsplash and is covered by the Unsplash License,
  which permits commercial use without attribution:
      https://unsplash.com/license

  These are placeholders. Replace them with your own product and studio
  photography before launch - either by overwriting the files here, or by
  uploading images in the theme editor, which always take priority.

  Usage:
      pwsh ./scripts/fetch-stock-images.ps1
      pwsh ./scripts/fetch-stock-images.ps1 -Force   # re-download everything
#>

[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$assets = Join-Path (Split-Path $PSScriptRoot -Parent) 'assets'

if (-not (Test-Path $assets)) {
    New-Item -ItemType Directory -Path $assets | Out-Null
}

# filename => @{ id = <unsplash photo id>; w = <width to request> }
$images = [ordered]@{
    'hero-1.jpg'        = @{ id = 'photo-1490481651871-ab68de25d43d'; w = 2400 }
    'hero-2.jpg'        = @{ id = 'photo-1445205170230-053b83016050'; w = 2400 }
    'hero-3.jpg'        = @{ id = 'photo-1483985988355-763728e1935b'; w = 2400 }
    'collection-1.jpg'  = @{ id = 'photo-1483985988355-763728e1935b'; w = 1400 }
    'collection-2.jpg'  = @{ id = 'photo-1441986300917-64674bd600d8'; w = 1400 }
    'collection-3.jpg'  = @{ id = 'photo-1487222477894-8943e31ef7b2'; w = 1400 }
    'feature-1.jpg'     = @{ id = 'photo-1485462537746-965f33f7f6a7'; w = 1600 }
    'feature-2.jpg'     = @{ id = 'photo-1544441893-675973e31985';   w = 1600 }
    'newsletter-bg.jpg' = @{ id = 'photo-1479064555552-3ef4979f8908'; w = 2400 }
    'gallery-1.jpg'     = @{ id = 'photo-1469334031218-e382a71b716b'; w = 1000 }
    'gallery-2.jpg'     = @{ id = 'photo-1539109136881-3be0616acf4b'; w = 1000 }
    'gallery-3.jpg'     = @{ id = 'photo-1529139574466-a303027c1d8b'; w = 1000 }
    'gallery-4.jpg'     = @{ id = 'photo-1515886657613-9f3515b0c78f'; w = 1000 }
    'gallery-5.jpg'     = @{ id = 'photo-1503342217505-b0a15ec3261c'; w = 1000 }
    'gallery-6.jpg'     = @{ id = 'photo-1496747611176-843222e1e57c'; w = 1000 }
    'gallery-7.jpg'     = @{ id = 'photo-1492707892479-7bc8d5a4ee93'; w = 1000 }
    'gallery-8.jpg'     = @{ id = 'photo-1509319117193-57bab727e09d'; w = 1000 }
    'blog-1.jpg'        = @{ id = 'photo-1469334031218-e382a71b716b'; w = 1400 }
    'blog-2.jpg'        = @{ id = 'photo-1485462537746-965f33f7f6a7'; w = 1400 }
    'blog-3.jpg'        = @{ id = 'photo-1479064555552-3ef4979f8908'; w = 1400 }
}

$downloaded = 0
$skipped    = 0
$failed     = 0

foreach ($name in $images.Keys) {
    $target = Join-Path $assets $name

    if ((Test-Path $target) -and -not $Force) {
        Write-Host "  skip     $name (already present)" -ForegroundColor DarkGray
        $skipped++
        continue
    }

    $spec = $images[$name]
    $url  = "https://images.unsplash.com/$($spec.id)?w=$($spec.w)&q=80&fm=jpg&fit=max"

    try {
        Invoke-WebRequest -Uri $url -OutFile $target -TimeoutSec 60 -UseBasicParsing
        $kb = [math]::Round((Get-Item $target).Length / 1KB)
        Write-Host "  saved    $name ($kb KB)" -ForegroundColor Green
        $downloaded++
    }
    catch {
        Write-Host "  FAILED   $name - $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "$downloaded downloaded, $skipped skipped, $failed failed." -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 }
