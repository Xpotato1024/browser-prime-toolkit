import hashlib,json,re,sys
from pathlib import Path
path=Path(sys.argv[1])
record=next(x for x in json.loads(Path('/src/vendor/gmp-ecm/provenance.json').read_text())['files'] if x['path']=='stage2.c')
original=path.read_bytes()
if hashlib.sha256(original).hexdigest()!=record['sha256']:
    raise RuntimeError('ECM stage2 source pin mismatch')
text=original.decode()
pattern=re.compile(r'(?m)^([ \t]*)if \(stop_asap != NULL && \(\*stop_asap\)\(\)\)\n([ \t]*)goto (\w+);')
matches=list(pattern.finditer(text))
if len(matches)!=9: raise RuntimeError('ECM stage2 checkpoint coverage mismatch')
counter=1
def instrument(match):
    global counter
    counter+=1
    return match[1]+'prime_ecm_probe('+str(counter)+');\n'+match[0]
text=pattern.sub(instrument,text)
needle='  /* check alloc. size of f */'
if text.count(needle)!=1: raise RuntimeError('ECM entry mismatch')
text=text.replace(needle,'  prime_ecm_enter(dF,k,root_params->S,modulus->repr,use_ntt);\n'+needle)
if text.count('  return youpi;')!=1: raise RuntimeError('ECM exit mismatch')
text=text.replace('  return youpi;','  prime_ecm_probe(11);\n  return youpi;')
text='#include "/src/native/gmp/stage-probe.h"\n'+text
path.write_text(text)
print('ECM stage2 patch SHA256 '+hashlib.sha256(text.encode()).hexdigest(),file=sys.stderr)
