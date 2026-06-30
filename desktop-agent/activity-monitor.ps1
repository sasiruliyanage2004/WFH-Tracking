# d:\WFH Tracking\wfh-tracking-system\desktop-agent\activity-monitor.ps1
Add-Type -ReferencedAssemblies "System.Windows.Forms", "System.Drawing" -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class GlobalHook {
    private const int WH_KEYBOARD_LL = 13;
    private const int WH_MOUSE_LL = 14;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_LBUTTONDOWN = 0x0201;
    private const int WM_RBUTTONDOWN = 0x0204;
    private const int WM_MBUTTONDOWN = 0x0207;
    private const int WM_MOUSEMOVE = 0x0200;

    private static LowLevelProc _keyboardProc = KeyboardHookCallback;
    private static LowLevelProc _mouseProc = MouseHookCallback;
    private static IntPtr _keyboardHookID = IntPtr.Zero;
    private static IntPtr _mouseHookID = IntPtr.Zero;

    public static int KeyboardCount = 0;
    public static int MouseCount = 0;
    private static System.Threading.Timer _timer;
    private static long _lastMouseMoveTime = 0;

    public static void Start() {
        _keyboardHookID = SetHook(_keyboardProc, WH_KEYBOARD_LL);
        _mouseHookID = SetHook(_mouseProc, WH_MOUSE_LL);
        _timer = new System.Threading.Timer(Tick, null, 10000, 10000); // Trigger every 10 seconds
    }

    public static void Stop() {
        if (_timer != null) {
            _timer.Dispose();
        }
        UnhookWindowsHookEx(_keyboardHookID);
        UnhookWindowsHookEx(_mouseHookID);
    }

    private static IntPtr SetHook(LowLevelProc proc, int idHook) {
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule) {
            return SetWindowsHookEx(idHook, proc, GetModuleHandle(curModule.ModuleName), 0);
        }
    }

    private delegate IntPtr LowLevelProc(int nCode, IntPtr wParam, IntPtr lParam);

    private static IntPtr KeyboardHookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN)) {
            KeyboardCount++;
        }
        return CallNextHookEx(_keyboardHookID, nCode, wParam, lParam);
    }

    private static IntPtr MouseHookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0) {
            if (wParam == (IntPtr)WM_LBUTTONDOWN || wParam == (IntPtr)WM_RBUTTONDOWN || wParam == (IntPtr)WM_MBUTTONDOWN) {
                MouseCount++;
            } else if (wParam == (IntPtr)WM_MOUSEMOVE) {
                long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                if (now - _lastMouseMoveTime > 1000) {
                    MouseCount++;
                    _lastMouseMoveTime = now;
                }
            }
        }
        return CallNextHookEx(_mouseHookID, nCode, wParam, lParam);
    }

    private static void Tick(object state) {
        // Output to stdout for Electron to read
        Console.WriteLine("KEYS:" + KeyboardCount + "|CLICKS:" + MouseCount);
        Console.Out.Flush();
        KeyboardCount = 0;
        MouseCount = 0;
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);
}
"@

# Register hook
[GlobalHook]::Start()

# Handle clean exit on break
[AppDomain]::CurrentDomain.add_ProcessExit({
    [GlobalHook]::Stop()
})

# Run message loop to keep hooks capturing events
[System.Windows.Forms.Application]::Run()
