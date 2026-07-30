"""Executes every code cell of providence.ipynb in order, in one namespace.

This is what a judge does when they press Run All, so it is what has to be checked
before the notebook is published. A notebook whose assertions have never actually
been executed is exactly the kind of claim this project exists to avoid making.

    python notebook/run.py
"""

import io
import json
import sys
import traceback

with io.open("notebook/providence.ipynb", encoding="utf-8") as handle:
    notebook = json.load(handle)

namespace: dict = {"__name__": "__main__"}
executed = 0
failed = []

for index, cell in enumerate(notebook["cells"]):
    if cell["cell_type"] != "code":
        continue
    source = "".join(cell["source"])
    executed += 1
    buffer = io.StringIO()
    real_stdout = sys.stdout
    sys.stdout = buffer
    try:
        exec(compile(source, "<cell %d>" % index, "exec"), namespace)
        sys.stdout = real_stdout
    except Exception:
        sys.stdout = real_stdout
        failed.append((index, traceback.format_exc(limit=3)))
        print("FAILED cell %d" % index)
        print(buffer.getvalue())
        print(failed[-1][1])
        continue

    output = buffer.getvalue().strip()
    first = output.split("\n")[0] if output else "(no output)"
    print("ok  cell %-3d %s" % (index, first[:88]))

print()
print("%d code cells executed, %d failed" % (executed, len(failed)))
if failed:
    sys.exit(1)
print("every assertion in the notebook passed.")
