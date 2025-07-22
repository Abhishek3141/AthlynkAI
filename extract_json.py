# extract_json.py
import py7zr
import os

archive = "data/2016.NBA.Raw.SportVU.Game.Logs/01.01.2016.CHA.at.TOR.7z"
outdir  = "data/2016.NBA.Raw.SportVU.Game.Logs/Extracted"

os.makedirs(outdir, exist_ok=True)
with py7zr.SevenZipFile(archive, mode="r") as z:
    z.extractall(path=outdir)

print("Extracted to", outdir)
