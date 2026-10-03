#!/usr/bin/env python3
"""Diagnostic-only raw JPL download outside Git, with source size/checksum checks.
The mirror is an explicit option, listed by Astrodienst's official repository.
"""
import argparse, hashlib, json, pathlib, shutil, subprocess
ASSETS={
 'de441.eph':{'url':'https://ssd.jpl.nasa.gov/ftp/eph/planets/Linux/de441/linux_m13000p17000.441','mirror':'https://ephe.scryr.io/jpl/de441.eph','bytes':2788676624,'md5':'4e3b924463d17b68ec9c4a18240300cd'},
 'de431.eph':{'url':'https://ssd.jpl.nasa.gov/ftp/eph/planets/Linux/de431/lnxm13000p17000.431','mirror':'https://ephe.scryr.io/jpl/de431.eph','bytes':2788676624,'md5':'fad0f432ae18c330f9e14915fbf8960a'},
}
def hashes(path):
 s=hashlib.sha256();m=hashlib.md5()
 with path.open('rb') as f:
  while b:=f.read(16*1024*1024):s.update(b);m.update(b)
 return {'sha256':s.hexdigest(),'md5':m.hexdigest()}
def main():
 p=argparse.ArgumentParser();p.add_argument('--directory',type=pathlib.Path,required=True);p.add_argument('--file',choices=list(ASSETS),required=True);p.add_argument('--mirror',action='store_true');a=p.parse_args(); repo=pathlib.Path(__file__).resolve().parents[4]; target_dir=a.directory.expanduser().resolve(); assert target_dir!=repo and repo not in target_dir.parents, 'Diagnostic work directory must be outside repository'; a.directory.mkdir(parents=True,exist_ok=True);target=a.directory/a.file;spec=ASSETS[a.file];url=spec['mirror' if a.mirror else 'url'];reuse=False
 existing=target.stat().st_size if target.exists() else 0
 allocated=target.stat().st_blocks*512 if target.exists() else 0
 if existing==spec['bytes']:
  h=hashes(target);reuse=h['md5']==spec['md5']
 if not reuse:
  if shutil.disk_usage(a.directory).free+allocated<spec['bytes']+1024**3:raise RuntimeError('Insufficient free space plus existing file allocation; preserve at least1GiB margin')
  # Single destination; curl overwrites an incomplete file, not a second copy.
  subprocess.run(['/usr/bin/curl','--fail','--location','--retry','3','--output',str(target),url],check=True)
  h=hashes(target)
 assert target.stat().st_size==spec['bytes'],target.stat().st_size
 assert h['md5']==spec['md5'],h
 report={'filename':a.file,'downloadSource':url,'primarySource':spec['url'],'mirrorUsed':a.mirror,'reusedVerifiedFile':reuse,'bytes':spec['bytes'],**h,'officialMd5':spec['md5'],'officialMd5Source':'https://www.astro.com/swisseph-download/jplfiles/','md5Verified':True,'mirrorListingSource':'https://github.com/aloistr/swisseph#jpl-files'}
 (a.directory/(a.file+'.manifest.json')).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
