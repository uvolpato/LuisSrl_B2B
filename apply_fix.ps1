$path = 'C:\Progetti\Luis Srl - B2B\spese-spedizione.html'
$newCodePath = 'C:\Progetti\Luis Srl - B2B\_new_combobox.js'
$lines = Get-Content -Path $path
$newCode = Get-Content -Path $newCodePath

Write-Host "Original lines: $($lines.Count)"
Write-Host "New code lines: $($newCode.Count)"

# Build the result array:
# Part 1: lines 1-1285 (indices 0-1284) - everything before the broken section
$part1 = $lines[0..1284]

# Part 2: new clean code from _new_combobox.js
$part2 = $newCode

# Part 3: lines 1538-1583 (indices 1537-1582) - setLevel + empty + destPreview + empty + forEach (correct })
$part3 = $lines[1537..1582]

# Part 4: lines 1584-1778 (indices 1583-1777) - openEditor through /* Simulatore */ comment + simModal
$part4 = $lines[1583..1777]

# Part 5: Replace lines 1779-1783 (indices 1778-1782) - remove simNazioneInput, simRegioneInput, simComboboxNazione, simComboboxRegione; keep simRegioneField
$part5 = @("var simRegioneField = document.getElementById('sim-regione-field');")

# Part 6: lines 1784+ (indices 1783+) - empty line + openSim + rest
$part6 = $lines[1783..($lines.Count - 1)]

# Combine
$result = $part1 + $part2 + $part3 + $part4 + $part5 + $part6

Write-Host "Result lines: $($result.Count)"

# Verify boundaries
Write-Host "Before/After Part2 - last of part1: '$($part1[-1])'"
Write-Host "Before/After Part2 - first of part2: '$($part2[0])'"
Write-Host "Before/After Part3 - last of part2: '$($part2[-1])'"
Write-Host "Before/After Part3 - first of part3: '$($part3[0])'"
Write-Host "Before/After Part4 - last of part3: '$($part3[-1])'"
Write-Host "Before/After Part4 - first of part4: '$($part4[0])'"
Write-Host "Before/After Part5 - last of part4: '$($part4[-1])'"
Write-Host "Before/After Part5 - first of part5: '$($part5[0])'"
Write-Host "Before/After Part6 - last of part5: '$($part5[-1])'"
Write-Host "Before/After Part6 - first of part6: '$($part6[0])'"

# Write result
Set-Content -Path $path -Value $result -Encoding UTF8 -NoNewline
$content = Get-Content -Path $path -Raw
$content = $content -replace "`r`n", "`n"
Set-Content -Path $path -Value $content -Encoding UTF8 -NoNewline

Write-Host "File written. New line count: $((Get-Content -Path $path).Count)"
