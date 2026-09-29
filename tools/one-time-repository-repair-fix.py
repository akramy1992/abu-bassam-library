from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]

# Remove the deleted sections from settings decorations and synchronize visible release identity.
p=ROOT/'web'/'app-settings-runtime.js'
s=p.read_text(encoding='utf-8')
s=s.replace("const APP_VERSION='4.3.2',BUILD_NUMBER='432',RELEASE_DATE='2026-09-20';","const APP_VERSION='6.0.0',BUILD_NUMBER='600',RELEASE_DATE='2026-09-29';")
s=s.replace("['.app .panel','#nationalCenter','#cardsCenter','#vaultCenter','#questionsCenter','#compressorCenter']","['.app .panel','#nationalCenter','#cardsCenter','#vaultCenter']")
p.write_text(s,encoding='utf-8')

# A retired release number must not remain in live web source. Replace only the old semantic version literal.
for p in (ROOT/'web').iterdir():
    if p.suffix.lower() not in {'.js','.html'}: continue
    s=p.read_text(encoding='utf-8')
    if '4.3.2' in s:
        p.write_text(s.replace('4.3.2','6.0.0'),encoding='utf-8')

# Strengthen release identity checker so old release identity cannot silently return to runtime files.
p=ROOT/'tools'/'check_release_identity.js'
s=p.read_text(encoding='utf-8')
needle="if(!app.android?.package)errors.push('Android package is missing');\n"
extra="""if(!app.android?.package)errors.push('Android package is missing');
for(const name of fs.readdirSync(path.join(root,'web')).filter(n=>/\\.(?:js|html)$/i.test(n))){const src=fs.readFileSync(path.join(root,'web',name),'utf8');if(src.includes('4.3.2'))errors.push(`${name}: retired release 4.3.2 remains in live source`)}
"""
if needle in s:s=s.replace(needle,extra,1)
p.write_text(s,encoding='utf-8')
print('Second-pass cleanup applied to settings and live release identity.')
