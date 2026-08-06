$path = 'C:\Progetti\Luis Srl - B2B\spese-spedizione.html'
$newCodePath = 'C:\Progetti\Luis Srl - B2B\_new_combobox.js'
$lines = Get-Content -Path $path
$newCode = Get-Content -Path $newCodePath

Write-Host "Original lines: $($lines.Count)"
Write-Host "New code lines: $($newCode.Count)"

# Verify boundaries
Write-Host "Index 1284: '$($lines[1284])'"
Write-Host "Index 1285: '$($lines[1285])'"
Write-Host "Index 1521: '$($lines[1521])'"
Write-Host "Index 1522: '$($lines[1522])'"
Write-Host "Index 1532: '$($lines[1532])'"
Write-Host "Index 1537: '$($lines[1537])'"
Write-Host "Index 1777: '$($lines[1777])'"
Write-Host "Index 1781: '$($lines[1781])'"
Write-Host "Index 1782: '$($lines[1782])'"
