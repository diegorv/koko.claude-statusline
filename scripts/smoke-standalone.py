"""Compare direct TypeScript and a local release bundle on the supplied runtimes."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def main(runtimes):
    root = Path(__file__).resolve().parents[1]
    cases = [
        ({"model": {"display_name": "Opus"}, "context_window": {"used_percentage": 42},
          "cost": {"total_cost_usd": 1.5, "total_duration_ms": 60000}}, [], ["Opus"]),
        ({"product": "antigravity", "model": {"display_name": "Gemini"},
          "cost": {"total_usd": 0.42, "estimated": True}, "terminal_width": 120},
         ["--agent", "antigravity"], ["Gemini", "~$0.42"]),
    ]
    with tempfile.TemporaryDirectory(prefix="koko-smoke-") as temp:
        work = Path(temp)
        checkout = work / "source"
        shutil.copytree(root / "src", checkout / "src")
        shutil.copy2(root / "package.json", checkout / "package.json")
        bundle = work / "bundle" / "statusline.mjs"
        bundle.parent.mkdir()
        entry = checkout / "src" / "index.ts"
        subprocess.run(["bun", "build", str(entry), "--target=node", "--outfile=" + str(bundle)],
                       cwd=work, check=True)
        user_dir = work / "home"
        user_dir.mkdir()
        env = {"PATH": os.environ["PATH"], "HOME": str(user_dir), "COLUMNS": "120",
               "XDG_CONFIG_HOME": str(user_dir / "config")}
        for runtime in runtimes:
            version = subprocess.check_output([runtime, "--version"], text=True).strip()
            for payload, args, labels in cases:
                outputs = [subprocess.check_output([runtime, str(path), *args], env=env, cwd=work,
                                                   input=json.dumps(payload).encode(), timeout=20)
                           for path in (entry, bundle)]
                if outputs[0] != outputs[1] or any(label.encode() not in outputs[0] for label in labels):
                    raise SystemExit(f"Unexpected source/bundle output for {labels[0]} on {runtime} {version}")
                print(f"{runtime} {version}: {labels[0]} source and bundle matched")


if __name__ == "__main__":
    main(sys.argv[1:] or ["bun", "node"])
