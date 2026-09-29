const fs=require('fs'),path=require('path');
const web=path.resolve(__dirname,'..','web');
const files=fs.readdirSync(web).filter(n=>n.endsWith('.js'));
const allowedLegacySecretFiles=new Set(['security-bootstrap-guard-runtime.js']);
const failures=[];
for(const name of files){const src=fs.readFileSync(path.join(web,name),'utf8');if(src.includes('__dev_secure_')&&!allowedLegacySecretFiles.has(name))failures.push(`${name}: new legacy device-secret web-storage fallback is forbidden`)}
const bootstrap=fs.readFileSync(path.join(web,'security-bootstrap-guard-runtime.js'),'utf8');
for(const marker of ['LEGACY_SECRET_PREFIX','wipeLegacySecretStorage','installLegacySecretStorageBlock','Storage?.prototype','startsWith(LEGACY_SECRET_PREFIX)'])if(!bootstrap.includes(marker))failures.push(`security bootstrap missing ${marker}`);
const failClosed=fs.readFileSync(path.join(web,'fail-closed-runtime.js'),'utf8');
for(const marker of ['sensitiveButtons','acctRecoveryGenerate','acctRecoverDo','secureBridgeReady','stopImmediatePropagation','blockBranchVaultWithoutSecureStore'])if(!failClosed.includes(marker))failures.push(`fail-closed guard missing ${marker}`);
const password=fs.readFileSync(path.join(web,'password-policy-runtime.js'),'utf8');
for(const marker of ["setAttribute('minlength','12')",'enforceSignup','stopImmediatePropagation'])if(!password.includes(marker))failures.push(`password compatibility guard missing ${marker}`);
const secureSync=fs.readFileSync(path.join(web,'secure-sync-runtime.js'),'utf8');
if(!secureSync.includes("path = `${account.id}/vault/"))failures.push('secure-sync legacy vault marker changed: review this debt allowlist before accepting new behavior');
const branch=fs.readFileSync(path.join(web,'branch-vault-runtime.js'),'utf8');
for(const marker of ['SECURE_STORAGE_REQUIRED','c.uploadVault=uploadVault','c.downloadVault=downloadVault','c.removeVault=removeVault','__abuBranchVaultPatched'])if(!branch.includes(marker))failures.push(`branch gateway missing ${marker}`);
const appSecurity=fs.readFileSync(path.join(web,'app-security-runtime.js'),'utf8');
for(const marker of ["const APP_VERSION='5.0.0'","const DEVICE_ID_KEY='abuBassamLockedDeviceIdV5'","const DEVICE_NAME_KEY='abuBassamLockedDeviceNameV5'"])if(!appSecurity.includes(marker))failures.push(`app-security V5 identity missing ${marker}`);
for(const legacy of ["APP_VERSION='4.3.2'",'abuBassamLockedDeviceIdV3','abuBassamLockedDeviceNameV3'])if(appSecurity.includes(legacy))failures.push(`app-security legacy identity is forbidden: ${legacy}`);
const hardening=fs.readFileSync(path.join(web,'security-hardening-runtime.js'),'utf8');
for(const marker of ["const APP_VERSION='5.0.0'","localStorage.getItem('abuBassamLockedDeviceIdV5')"])if(!hardening.includes(marker))failures.push(`security-hardening V5 identity missing ${marker}`);
for(const legacy of ["APP_VERSION='4.3.2'",'abuBassamLockedDeviceIdV3'])if(hardening.includes(legacy))failures.push(`security-hardening legacy identity is forbidden: ${legacy}`);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('legacy security debt contained: only the bootstrap guard may mention the retired __dev_secure_ prefix so it can erase/block old values; all functional device-secret access requires native SecureStore; legacy signup is intercepted by the 12-character policy; app security/offline trust are locked to V5 identity; and the legacy vault path is replaced by Branch Vault before use.');
