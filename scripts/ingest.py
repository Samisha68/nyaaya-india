#!/usr/bin/env python3
"""Structure-aware legal PDF ingestion with deterministic local embeddings."""
import hashlib, json, math, re, sys
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
pdf = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "data/sources/constitution-of-india-2026.pdf")
if not pdf.is_absolute(): pdf = ROOT / pdf
if not pdf.exists(): raise SystemExit(f"Source PDF not found: {pdf}")
sidecar = pdf.with_suffix(".metadata.json")
meta = json.loads(sidecar.read_text()) if sidecar.exists() else {
  "id": pdf.stem, "title": pdf.stem.replace("-", " ").title(), "type": "legislation",
  "jurisdiction": "India", "authority": "Unknown - verify before publishing",
  "sourceUrl": "", "sourceDocument": pdf.name, "verified": False
}

def clean(text):
  text = text.replace("\u00ad", "").replace("\r", "")
  text = re.sub(r"(?m)^\s*(?:THE CONSTITUTION OF INDIA|CONSTITUTION OF INDIA|\d+)\s*$", "", text)
  text = re.sub(r"(?m)^\s*\*.*?\*\s*$", "", text)
  text = re.sub(r"-\n(?=[a-z])", "", text)
  text = re.sub(r"[ \t]+", " ", text)
  text = re.sub(r"\n{3,}", "\n\n", text)
  return text.strip()

def vectorize(text, size=384):
  v=[0.0]*size
  tokens=re.findall(r"[a-z0-9]+", text.lower())
  for token in tokens:
    h=int(hashlib.sha256(token.encode()).hexdigest()[:8],16)
    v[h%size]+=1.0 if (h>>8)&1 else -1.0
  n=math.sqrt(sum(x*x for x in v)) or 1
  return [round(x/n,6) for x in v]

reader=PdfReader(str(pdf))
pages=[]
for i,page in enumerate(reader.pages): pages.append((i+1, clean(page.extract_text() or "")))
full="\n".join(t for _,t in pages)
# Article headings are title-case lines such as "22. Protection against arrest and detention...".
pattern=re.compile(r"(?m)^\s*(?:\d+\[)?(\d+[A-Z]?)\.\s+([^\n]{3,180})$")
matches=list(pattern.finditer(full))
best={}
for i,m in enumerate(matches):
  article=m.group(1); heading=m.group(2).strip(" .")
  end=matches[i+1].start() if i+1<len(matches) else min(len(full),m.end()+12000)
  body=clean(full[m.start():end])
  if len(body)<80 or len(body)>18000: continue
  # The first substantial occurrence is the provision itself; later repeats are
  # commonly schedule paragraph numbers or amendment/footnote references.
  if article not in best: best[article]=(heading,body)

chunks=[]
for article,(heading,body) in best.items():
  pieces=[body]
  if len(body)>6500:
    paragraphs=re.split(r"\n(?=\([a-z0-9]+\)|\d+\.)",body); pieces=[]; current=""
    for p in paragraphs:
      if current and len(current)+len(p)>5000: pieces.append(current.strip()); current=""
      current += ("\n" if current else "")+p
    if current: pieces.append(current.strip())
  for index,text in enumerate(pieces):
    chunk_id=f"{meta['id']}:article-{article.lower()}:{index+1}"
    chunks.append({**meta,"chunkId":chunk_id,"article":article,"section":None,"subsection":None,
      "heading":heading,"chunkIndex":index,"text":text,"embedding":vectorize(f"Article {article} {heading} {text}")})

out=ROOT/"data/processed"/(meta["id"]+".json")
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({"source":meta,"stats":{"pages":len(pages),"articles":len(best),"chunks":len(chunks)},"chunks":chunks},ensure_ascii=False))
print(f"Ingested {len(pages)} pages into {len(chunks)} chunks ({len(best)} articles): {out}")
