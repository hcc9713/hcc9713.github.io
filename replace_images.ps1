# PowerShell脚本：自动替换HTML中的图片为Base64
Write-Host "正在替换图片为Base64..." -ForegroundColor Green

# 读取Base64文件内容
$whc_base64 = Get-Content "whc_base64.txt" -Raw
$work1_base64 = Get-Content "work_1_base64.txt" -Raw
$work2_base64 = Get-Content "work_2_base64.txt" -Raw
$work3_base64 = Get-Content "work_3_base64.txt" -Raw

# 清理Base64字符串（移除换行符和空格）
$whc_base64 = $whc_base64.Trim()
$work1_base64 = $work1_base64.Trim()
$work2_base64 = $work2_base64.Trim()
$work3_base64 = $work3_base64.Trim()

# 读取HTML文件
$htmlContent = Get-Content "index.html" -Raw

# 替换占位符为Base64数据URL
$htmlContent = $htmlContent -replace "{{WHC_BASE64}}", "data:image/jpeg;base64,$whc_base64"
$htmlContent = $htmlContent -replace "{{WORK1_BASE64}}", "data:image/jpeg;base64,$work1_base64"
$htmlContent = $htmlContent -replace "{{WORK2_BASE64}}", "data:image/jpeg;base64,$work2_base64"
$htmlContent = $htmlContent -replace "{{WORK3_BASE64}}", "data:image/jpeg;base64,$work3_base64"

# 保存修改后的HTML文件
$htmlContent | Out-File "index.html" -Encoding utf8

Write-Host "替换完成！图片已内嵌到HTML中。" -ForegroundColor Green
Write-Host "现在可以推送到GitHub，图片将直接显示，不依赖FC文件系统。" -ForegroundColor Yellow
