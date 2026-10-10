import { chmodSync, lstatSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

/** Reject links in every existing path component, including a linked data root. */
export function assertPrivatePath(path) {
  const target = resolve(path);
  for (let part = target; ; part = dirname(part)) {
    const stat = lstatSync(part, { throwIfNoEntry: false });
    if (stat && (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()) || (stat.isFile() && stat.nlink !== 1))) {
      throw new Error(`Unsafe private path: ${part}`);
    }
    if (part === dirname(part)) break;
  }
}

/** Restrict application-owned paths; never traverse a symlink/junction or hard link. */
export function protectPrivatePath(path, mode, { recursive = false } = {}) {
  assertPrivatePath(path);
  const paths = [];
  const collect = (target, expectedMode) => {
    const stat = lstatSync(target);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()) || (stat.isFile() && stat.nlink !== 1)) {
      throw new Error(`Unsafe private path: ${target}`);
    }
    const actualMode = stat.isDirectory() ? 0o700 : 0o600;
    if (expectedMode !== actualMode) throw new Error(`Unexpected private path type: ${target}`);
    paths.push({ path: resolve(target), directory: stat.isDirectory() });
    if (recursive && stat.isDirectory()) {
      for (const name of readdirSync(target)) {
        const child = join(target, name);
        collect(child, lstatSync(child).isDirectory() ? 0o700 : 0o600);
      }
    }
  };
  // Preflight the complete tree before changing permissions on any entry.
  collect(path, mode);
  if (process.platform !== 'win32') {
    for (const entry of paths) chmodSync(entry.path, entry.directory ? 0o700 : 0o600);
    return;
  }
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `
 $ErrorActionPreference = 'Stop'
 [Console]::InputEncoding = New-Object System.Text.UTF8Encoding
 $entries = [Console]::In.ReadToEnd() | ConvertFrom-Json
 $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
 $allowed = @($sid.Value, 'S-1-5-18', 'S-1-5-32-544') | Select-Object -Unique
 function Test-PrivateAcl($acl, $inheritance) {
  $rules = @($acl.Access)
  $identities = @($rules | ForEach-Object { $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value })
  return ($acl.AreAccessRulesProtected -and $rules.Count -eq $allowed.Count -and
   @($allowed | Where-Object { $_ -notin $identities }).Count -eq 0 -and
   @($rules | Where-Object { $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -notin $allowed -or
    $_.AccessControlType -ne 'Allow' -or $_.FileSystemRights -ne 'FullControl' -or $_.IsInherited -or
    $_.InheritanceFlags -ne $inheritance -or $_.PropagationFlags -ne 'None' }).Count -eq 0)
 }
 # Check native reparse attributes as well as Node's symlink/junction preflight.
 foreach ($entry in $entries) {
  $item = Get-Item -LiteralPath $entry.path -Force
  while ($null -ne $item) {
   if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'Unsafe private reparse point' }
   $item = if ($item -is [System.IO.DirectoryInfo]) { $item.Parent } else { $item.Directory }
  }
 }
 foreach ($entry in $entries) {
  $target = $entry.path
  $inheritance = if ($entry.directory) { [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit' } else { [System.Security.AccessControl.InheritanceFlags]::None }
  $existing = Get-Acl -LiteralPath $target
  if (Test-PrivateAcl $existing $inheritance) { continue }
  $acl = if ($entry.directory) { New-Object System.Security.AccessControl.DirectorySecurity } else { New-Object System.Security.AccessControl.FileSecurity }
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($identity in $allowed) {
   $rule = New-Object System.Security.AccessControl.FileSystemAccessRule([System.Security.Principal.SecurityIdentifier]$identity, 'FullControl', $inheritance, 'None', 'Allow')
   $acl.AddAccessRule($rule)
  }
  (Get-Item -LiteralPath $target -Force).SetAccessControl($acl)
  if (-not (Test-PrivateAcl (Get-Acl -LiteralPath $target) $inheritance)) { throw 'Private ACL verification failed' }
 }
 `], { input: JSON.stringify(paths), stdio: ['pipe', 'pipe', 'pipe'] });
}
