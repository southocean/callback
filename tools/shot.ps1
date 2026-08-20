# Screen-capture a window to a PNG.
#
# The browser automation tooling can show a screenshot but cannot write one to
# disk, which makes a real pixel diff impossible. This does: it finds a window
# by title, brings it to the front, waits for it to paint, and captures its
# client area to a file. Two captures of the same window are pixel-comparable,
# which is all the diff needs.
#
#   powershell -File tools/shot.ps1 -Match "Meet" -Out ref.png [-Delay 1200]

param(
  [Parameter(Mandatory=$true)][string]$Match,
  [Parameter(Mandatory=$true)][string]$Out,
  [int]$Delay = 1200,
  [int]$ChromeTop = 0      # extra pixels to crop off the top (browser chrome)
)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
}
"@

$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*$Match*" -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { Write-Error "no window matching '$Match'"; exit 1 }

$h = $proc.MainWindowHandle
[Win]::ShowWindow($h, 9) | Out-Null      # SW_RESTORE
[Win]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds $Delay

$r = New-Object Win+RECT
[Win]::GetClientRect($h, [ref]$r) | Out-Null
$origin = New-Object Win+POINT
$origin.X = 0; $origin.Y = 0
[Win]::ClientToScreen($h, [ref]$origin) | Out-Null

$x = $origin.X
$y = $origin.Y + $ChromeTop
$w = $r.R - $r.L
$hh = ($r.B - $r.T) - $ChromeTop
if ($w -le 0 -or $hh -le 0) { Write-Error "bad client rect ${w}x${hh}"; exit 1 }

$bmp = New-Object System.Drawing.Bitmap $w, $hh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($x, $y, 0, 0, $bmp.Size)
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "$Out ${w}x${hh} from '$($proc.MainWindowTitle)'"
