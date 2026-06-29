// Lightweight launcher for the Mowgli level editor.
//
// editor.exe sits in the project root. Double-clicking it starts the local
// Vite dev server (npm run editor), which serves the standalone editor page and
// opens it in the default browser. The console window shows the server log;
// closing it stops the server. Compiled with the Windows built-in csc.exe via
// tools/build-editor-exe.ps1 — no external toolchain required.

using System;
using System.Diagnostics;

class EditorLauncher
{
    static int Main()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        Console.Title = "Mowgli Level Editor";
        Console.WriteLine("Mowgli's Toad Jumper — Level Editor");
        Console.WriteLine("-----------------------------------");
        Console.WriteLine("Starting the editor dev server in:");
        Console.WriteLine("  " + dir);
        Console.WriteLine();
        Console.WriteLine("A browser tab will open at the editor.");
        Console.WriteLine("Keep this window open while editing; close it to stop the server.");
        Console.WriteLine();

        var psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c npm run editor",
            WorkingDirectory = dir,
            UseShellExecute = false
        };

        try
        {
            using (var proc = Process.Start(psi))
            {
                proc.WaitForExit();
                return proc.ExitCode;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Failed to start the editor: " + ex.Message);
            Console.WriteLine("Make sure Node.js and npm are installed and that editor.exe");
            Console.WriteLine("sits in the project folder (next to package.json).");
            Console.WriteLine();
            Console.WriteLine("Press any key to close.");
            Console.ReadKey();
            return 1;
        }
    }
}
