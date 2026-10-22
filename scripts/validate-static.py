#!/usr/bin/env python3
"""Static checks only. Browser and PostgreSQL integration tests remain separate."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import tinycss2
from pglast import parse_sql

ROOT = Path(__file__).resolve().parents[1]
errors = []
class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=set()
        self.references=[]
        self.lang=False
        self.main=0
        self.headings=0
        self.images=0
        self.metadata=set()
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=="html" and attrs.get("lang")=="pt-BR": self.lang=True
        if tag=="main": self.main+=1
        if tag=="h1": self.headings+=1
        if attrs.get("id"):
            if attrs["id"] in self.ids:
                errors.append(f"Duplicate ID: {attrs['id']}")
            self.ids.add(attrs["id"])
        if tag=="img":
            self.images+=1
            if "alt" not in attrs: errors.append("Image missing alt")
        if tag in {"script","img","link","a","source"}:
            for attr in ("src","href"):
                if attrs.get(attr):self.references.append(attrs[attr])
            if attrs.get("srcset"):
                self.references += [part.strip().split(" ")[0] for part in attrs["srcset"].split(",")]
        if tag=="meta":
            self.metadata.add(attrs.get("name") or attrs.get("property") or "")

def validate_html(file):
    doc=Document()
    try:doc.feed(file.read_text(encoding="utf-8"))
    except Exception as e:errors.append(f"{file.name}: invalid markup: {e}")
    if not doc.lang:errors.append(f"{file.name}: missing lang=pt-BR")
    if doc.main!=1:errors.append(f"{file.name}: expected one main, found {doc.main}")
    if doc.headings<1:errors.append(f"{file.name}: missing H1")
    for ref in doc.references:
        if ref.startswith(("https:","http:","mailto:","tel:","data:","blob:","about:","#","javascript:","sms:")):continue
        base=ref.split("#")[0].split("?")[0]
        if base and not (ROOT/base).exists():
            errors.append(f"{file.name}: broken local reference: {base}")
    if file.name=="index.html":
        for meta in ("description","og:title","og:description","og:image","twitter:card"):
            if meta not in doc.metadata:errors.append(f"index.html: missing {meta}")
    print(f"{file.name}: HTML parsed, {len(doc.ids)} IDs, {doc.images} images")

def inspect_rules(rules,file):
    for rule in rules:
        if rule.type=="error":errors.append(f"{file.name}: CSS parse error {rule.message}")
        elif rule.type=="qualified-rule":
            for d in tinycss2.parse_declaration_list(rule.content,skip_comments=True,skip_whitespace=True):
                if d.type=="error":errors.append(f"{file.name}: declaration error {d.message}")
        elif rule.type=="at-rule" and rule.content:
            keyword=rule.at_keyword.lower()
            if keyword in ("media","supports","container","layer","keyframes"):
                inspect_rules(tinycss2.parse_rule_list(rule.content,skip_comments=True,skip_whitespace=True),file)

def validate_css(file):
    src=file.read_text(encoding="utf-8")
    inspect_rules(tinycss2.parse_stylesheet(src,skip_whitespace=True,skip_comments=True),file)
    print(f"{file.name}: CSS parse checked, {len(src)} characters")

def validate_sql(file):
    text=file.read_text(encoding="utf-8")
    try:parse_sql(text)
    except Exception as ex:errors.append(f"{file.name}: PostgreSQL syntax error: {ex}")
    print(f"{file.name}: PostgreSQL AST checked")

for file in (ROOT/"index.html",ROOT/"admin.html",ROOT/"privacidade.html",ROOT/"termos.html"):
    validate_html(file)
for file in sorted(ROOT.glob("*.css")):
    validate_css(file)
for file in sorted((ROOT/"supabase/migrations").glob("*.sql")):
    validate_sql(file)
if errors:
    print("\nFAILED STATIC CHECKS")
    for err in errors:print(" - "+err)
    sys.exit(1)
print("PASS: HTML references, accessibility landmarks, CSS syntax and PostgreSQL parser")
