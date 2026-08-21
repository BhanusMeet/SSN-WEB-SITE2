$ffmpeg = "ffmpeg"
$ssnDir = "c:\Users\Meet\OneDrive\Documents\ssn"

# 1. Hero banner
Write-Host "Converting Hero Banner..."
& $ffmpeg -y -i "$ssnDir\assets\images\hero-banner.png" -c:v libwebp -quality 80 "$ssnDir\assets\images\hero-banner.webp"
& $ffmpeg -y -i "$ssnDir\assets\images\hero-banner.png" -vf "scale=800:-1" -c:v libwebp -quality 80 "$ssnDir\assets\images\hero-banner-mobile.webp"

# 2. Categories
$categories = Get-ChildItem "$ssnDir\assets\images\categories\*.png"
foreach ($cat in $categories) {
    $baseName = $cat.BaseName
    Write-Host "Converting Category $baseName..."
    & $ffmpeg -y -i $cat.FullName -c:v libwebp -quality 80 "$ssnDir\assets\images\categories\$baseName.webp"
    & $ffmpeg -y -i $cat.FullName -vf "scale=500:-1" -c:v libwebp -quality 80 "$ssnDir\assets\images\categories\$baseName-sm.webp"
}

# 3. Products
$products = Get-ChildItem "$ssnDir\assets\images\products\*.png"
foreach ($prod in $products) {
    $baseName = $prod.BaseName
    Write-Host "Converting Product $baseName..."
    & $ffmpeg -y -i $prod.FullName -c:v libwebp -quality 82 "$ssnDir\assets\images\products\$baseName.webp"
    & $ffmpeg -y -i $prod.FullName -vf "scale=400:-1" -c:v libwebp -quality 82 "$ssnDir\assets\images\products\$baseName-sm.webp"
}

# 4. Logo
& $ffmpeg -y -i "$ssnDir\assets\images\logo.png" -c:v libwebp -quality 90 "$ssnDir\assets\images\logo.webp"

Write-Host "Conversion Complete!"
