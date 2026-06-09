Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class User32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@
try {
    $hwnd = [User32]::GetForegroundWindow()
    if ($hwnd -ne [IntPtr]::Zero) {
        $windowPid = 0
        [void][User32]::GetWindowThreadProcessId($hwnd, [ref]$windowPid)
        if ($windowPid -gt 0) {
            $process = Get-Process -Id $windowPid
            $processName = $process.ProcessName
            $windowTitle = $process.MainWindowTitle
            if ([string]::IsNullOrEmpty($processName)) {
                $processName = "Unknown"
            }
            if ([string]::IsNullOrEmpty($windowTitle)) {
                $windowTitle = "Active Window"
            }
            Write-Output "App:$processName|Title:$windowTitle"
        }
    }
} catch {
    # Fail silently
}
