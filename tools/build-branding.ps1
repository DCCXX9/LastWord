# Rebuild branding from the exact supplied raster, without changing the design.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path $PSScriptRoot
$sourcePath=Join-Path $root 'icons/source.png'
$source=[Drawing.Image]::FromFile($sourcePath)
function Save-Png($bitmap,$path){
    $stream=[IO.MemoryStream]::new()
    try{$bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png);[IO.File]::WriteAllBytes($path,$stream.ToArray())}
    finally{$stream.Dispose()}
}
function Draw-Logo($bitmap,$rectangle){
    $graphics=[Drawing.Graphics]::FromImage($bitmap)
    $attributes=[Drawing.Imaging.ImageAttributes]::new()
    try{
        $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $attributes.SetWrapMode([Drawing.Drawing2D.WrapMode]::TileFlipXY)
        $graphics.DrawImage($source,$rectangle,0,0,$source.Width,$source.Height,[Drawing.GraphicsUnit]::Pixel,$attributes)
    }finally{$attributes.Dispose();$graphics.Dispose()}
}
try{
    foreach($size in 16,32,48,128){
        $bitmap=[Drawing.Bitmap]::new($size,$size)
        try{Draw-Logo $bitmap ([Drawing.Rectangle]::new(0,0,$size,$size));Save-Png $bitmap (Join-Path $root "icons/icon$size.png")}
        finally{$bitmap.Dispose()}
    }
    Copy-Item -LiteralPath (Join-Path $root 'icons/icon128.png') -Destination (Join-Path $root 'release/assets/icon128.png')
    # Cover the old logo in its existing slot; retain the promotional layout.
    $promoPath=Join-Path $root 'release/assets/promo440.png'
    $original=[Drawing.Image]::FromFile($promoPath)
    $promo=[Drawing.Bitmap]::new($original)
    $original.Dispose()
    try{Draw-Logo $promo ([Drawing.Rectangle]::new(40,92,96,96));Save-Png $promo $promoPath}
    finally{$promo.Dispose()}
}finally{$source.Dispose()}
Write-Output 'Rebuilt extension icons, store icon and promotional logo.'
