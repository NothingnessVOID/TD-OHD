import {chmodSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
/** Restrict only the application's own data directory/file, using native permissions. */
export function protectPrivatePath(path, mode) {
 if (process.platform !== 'win32') { chmodSync(path, mode); return; }
 const env={...process.env,OHD_PRIVATE_PATH:path,OHD_PRIVATE_DIRECTORY:mode===0o700?'1':'0'};
 execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`
 $target = $env:OHD_PRIVATE_PATH
 $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
 $allowed = @($sid.Value, 'S-1-5-18', 'S-1-5-32-544')
 $existing = Get-Acl -LiteralPath $target
 $rules = @($existing.Access)
 if ($existing.AreAccessRulesProtected -and $rules.Count -eq 3 -and @($rules | Where-Object { $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -notin $allowed -or $_.AccessControlType -ne 'Allow' -or $_.FileSystemRights -ne 'FullControl' }).Count -eq 0) { exit 0 }
 $acl = if ($env:OHD_PRIVATE_DIRECTORY -eq '1') { New-Object System.Security.AccessControl.DirectorySecurity } else { New-Object System.Security.AccessControl.FileSecurity }
 $acl.SetAccessRuleProtection($true, $false)
 $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
 $inheritance = if ($env:OHD_PRIVATE_DIRECTORY -eq '1') { [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit' } else { [System.Security.AccessControl.InheritanceFlags]::None }
 foreach ($identity in @($sid, [System.Security.Principal.SecurityIdentifier]'S-1-5-18', [System.Security.Principal.SecurityIdentifier]'S-1-5-32-544')) {
  $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', $inheritance, 'None', 'Allow')
  $acl.AddAccessRule($rule)
 }
 Set-Acl -LiteralPath $target -AclObject $acl -ErrorAction Stop
 `],{env,stdio:'pipe'});
}
