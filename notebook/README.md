# The Kaggle notebook

`providence.ipynb` is the submission notebook. It is generated, not hand-edited.

## Uploading it

1. Kaggle, Code, New Notebook, then File, Import Notebook, and pick
   `providence.ipynb`.
2. Add-ons, Secrets, add `YOUVERSION_APP_KEY` with your App Key from
   platform.youversion.com. Enable it for the notebook.
3. Run All. Every cell prints its own proof.
4. Save Version, then set the notebook to Public before attaching it to the
   writeup.

Internet access must be on for the Scripture section. Everything else runs
offline: the engine is pure Python with no dependencies beyond the standard
library, so there is nothing to install and nothing to break.

## Without a key

The notebook says so and shows the silence. That is the designed behaviour rather
than a failure, and it happens to demonstrate the central claim of the project:
the engine holds references, the resolver is the only source of text, and with no
source the characters have nothing to say.

## Working on it

```
python notebook/build.py   # regenerate the .ipynb from build.py
python notebook/run.py     # execute every code cell in order, as Run All does
```

Edit `build.py`, never the `.ipynb`. JSON edited by hand acquires broken escapes
and duplicate cell ids within a day.

`run.py` exists because a notebook whose assertions have never been executed is
the sort of unchecked claim this project is built to avoid. It earned its keep on
the first run by catching an assertion that said Mary would eventually prefer
tidying at high enough disorder. She never does: her ceiling on tidying is her
order drive at 0.15, which sits below her floor on listening.
