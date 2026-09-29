(() => {
  'use strict';
  const DEVICE_ID_KEY = 'abuBassamLockedDeviceIdV3';
  const DEVICE_NAME_KEY = 'abuBassamLockedDeviceNameV3';
  const DEVICE_CREATED_KEY = 'abuBassamLockedDeviceCreatedV3';
  const APP_VERSION = '6.0.0';

  function uuid() { return globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function platform() { const agent=navigator.userAgent||''; if(/Android/i.test(agent))return'Android';if(/Windows/i.test(agent))return'Windows';if(/iPhone|iPad/i.test(agent))return'iOS';return'جهاز آخر'; }
  function normalizeName(value){return String(value||'').trim()||'جهاز المكتبة'}
  function signalBootReady(){try{window.ReactNativeWebView?.postMessage(JSON.stringify({type:'webBootReady',at:Date.now()}))}catch(_){}}
  function dismissSplash(){const splash=document.getElementById('splash');if(!splash)return;splash.style.transition='none';splash.style.opacity='0';splash.style.visibility='hidden';splash.style.display='none';splash.setAttribute('aria-hidden','true')}
  function installSplashWatchdog(){dismissSplash();signalBootReady();const run=()=>{dismissSplash();signalBootReady()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();setTimeout(run,120);setTimeout(run,600);setTimeout(run,1500);setTimeout(dismissSplash,1800)}
  function current(){const name=normalizeName(localStorage.getItem(DEVICE_NAME_KEY)||'جهاز المكتبة');return{id:localStorage.getItem(DEVICE_ID_KEY)||'',name,createdAt:localStorage.getItem(DEVICE_CREATED_KEY)||''}}
  function ensureIdentity(){let identity=current();if(identity.id)return identity;identity={id:uuid(),name:'جهاز المكتبة',createdAt:new Date().toISOString()};localStorage.setItem(DEVICE_ID_KEY,identity.id);localStorage.setItem(DEVICE_NAME_KEY,identity.name);localStorage.setItem(DEVICE_CREATED_KEY,identity.createdAt);localStorage.removeItem('abuBassamDeviceNameV1');return identity}
  async function heartbeat(){const identity=ensureIdentity(),cloud=window.AbuBassamCloud;if(!navigator.onLine||!cloud?.isConnected())return identity;const now=new Date().toISOString(),data={id:identity.id,name:identity.name,platform:platform(),locked:true,first_seen:identity.createdAt||now,last_seen:now,app_version:APP_VERSION};try{await cloud.upsert('device',identity.id,data)}catch(_){}return identity}
  async function list(){const identity=await heartbeat(),registry=window.AbuBassamDeviceRegistry;if(window.AbuBassamSecurity?.role?.()==='owner'&&registry?.rows){try{return(await registry.rows()).map(row=>({id:row.device_id,name:row.device_name,...row}))}catch(_){}}const now=new Date().toISOString();return[{id:identity.id,name:identity.name,platform:platform(),locked:true,first_seen:identity.createdAt,last_seen:now,updated_at:now,app_version:APP_VERSION}]}
  function deviceName(){return normalizeName(current().name||'جهاز المكتبة')}
  function loadScript(id,src,guard,onload){if(document.getElementById(id)||(guard&&window[guard])){if(onload)onload();return}const script=document.createElement('script');script.id=id;script.src=src;if(onload)script.onload=onload;(document.head||document.documentElement).appendChild(script)}
  function loadFeatureRecovery(){loadScript('abuFeatureRecoveryRuntime','feature-recovery-runtime.js','__ABU_FEATURE_RECOVERY_V1__')}
  function loadChildTemplates(){loadScript('abuChildTemplatesRuntime','child-card-templates-runtime.js','__ABU_CHILD_TEMPLATES_V1__')}
  function loadCardModels(){loadScript('abuCardModelsRuntime','card-models-runtime.js','__ABU_CARD_MODELS_V1__')}
  function loadStandaloneCardModels(){loadScript('abuStandaloneCardModelsRuntime','standalone-card-models-runtime.js','__ABU_STANDALONE_CARD_MODELS_V1__')}
  function loadStrictWorkflow(){loadScript('abuStrictWorkflowRuntime','strict-workflow-runtime.js','__ABU_STRICT_WORKFLOW_V1__')}
  function loadStandaloneFold(){loadScript('abuStandaloneFoldRuntime','standalone-fold-runtime.js','__ABU_STANDALONE_FOLD_V1__')}
  function loadDeviceReconcile(){loadScript('abuDeviceReconcileRuntime','device-reconcile-runtime.js','__ABU_DEVICE_RECONCILE_V2__')}
  function loadPermissionGuard(){loadScript('abuPermissionGuardRuntime','permission-guard-runtime.js','__ABU_PERMISSION_GUARD_V1__')}
  function loadAdminPermissions(){loadScript('abuAdminPermissionsRuntime','admin-permissions-runtime.js','__ABU_ADMIN_PERMISSIONS_V1__')}
  function loadPermissionSectionGuards(){loadScript('abuPermissionSectionGuardsRuntime','permission-section-guards-runtime.js','__ABU_PERMISSION_SECTION_GUARDS_V1__')}
  function loadCustomerPermissionsHardening(){loadScript('abuCustomerPermissionsHardeningRuntime','customer-permissions-hardening-runtime.js','__ABU_CUSTOMER_PERMISSIONS_HARDENING_V1__')}
  function loadLoginThrottleFix(){loadScript('abuLoginThrottleFixRuntime','login-throttle-fix-runtime.js','__ABU_LOGIN_THROTTLE_FIX_V1__')}
  function loadLoginInputDirection(){loadScript('abuLoginInputDirectionRuntime','login-input-direction-runtime.js','__ABU_LOGIN_INPUT_DIRECTION_V1__')}
  function loadPasswordPolicy(){loadScript('abuPasswordPolicyRuntime','password-policy-runtime.js','__ABU_PASSWORD_POLICY_V1__')}
  function loadSettingsCorrections(){loadScript('abuSettingsCorrectionsRuntime','settings-corrections-runtime.js','__ABU_SETTINGS_CORRECTIONS_V1__')}
  function loadWifiSyncGuard(){loadScript('abuWifiSyncGuardRuntime','wifi-sync-guard-runtime.js','__ABU_WIFI_SYNC_GUARD_V1__')}
  function loadSecurityHardening(){loadScript('abuSecurityHardeningRuntime','security-hardening-runtime.js','__ABU_SECURITY_HARDENING_V2__')}
  function loadNotificationCorrections(){loadScript('abuNotificationCenterCorrectionsRuntime','notification-center-corrections-runtime.js','__ABU_NOTIFICATION_CENTER_CORRECTIONS_V2__')}
  function loadBranchVault(){loadScript('abuBranchVaultRuntime','branch-vault-runtime.js','__ABU_BRANCH_VAULT_V1__')}
  function loadDocumentVaultHardening(){loadScript('abuDocumentVaultHardeningRuntime','document-vault-hardening-runtime.js','__ABU_DOCUMENT_VAULT_HARDENING_V1__')}
  function loadDocumentVaultPermissionGuard(){loadScript('abuDocumentVaultPermissionGuardRuntime','document-vault-permission-guard-runtime.js','__ABU_DOCUMENT_VAULT_PERMISSION_GUARD_V1__')}
  function loadEncryptedVaultHardening(){loadScript('abuEncryptedVaultHardeningRuntime','encrypted-vault-hardening-runtime.js','__ABU_ENCRYPTED_VAULT_HARDENING_V1__')}
  function loadOperationLogStorageMigration(){loadScript('abuOperationLogStorageMigrationRuntime','operation-log-storage-migration-runtime.js','__ABU_OPERATION_LOG_STORAGE_MIGRATION_V1__')}
  function loadOperationLogCorrections(){loadScript('abuOperationLogCorrectionsRuntime','operation-log-corrections-runtime.js','__ABU_OPERATION_LOG_CORRECTIONS_V2__',()=>setTimeout(loadOperationLogStorageMigration,0))}
  function loadSecurityExtras(){loadScript('abuSecurityExtrasRuntime','security-extras-runtime.js','__ABU_SECURITY_EXTRAS_V1__',()=>{setTimeout(loadPermissionGuard,20);setTimeout(loadLoginThrottleFix,35);setTimeout(loadLoginInputDirection,45);setTimeout(loadPasswordPolicy,55)})}
  function loadSecurity(){loadScript('abuAppSecurityRuntime','app-security-runtime.js','__ABU_APP_SECURITY_V1__',()=>{loadSecurityHardening();setTimeout(loadSecurityExtras,20);setTimeout(loadDeviceReconcile,40);setTimeout(loadAdminPermissions,80);setTimeout(loadPermissionSectionGuards,130);setTimeout(loadCustomerPermissionsHardening,160);setTimeout(loadLoginInputDirection,50);setTimeout(loadPasswordPolicy,90)})}
  function loadApprovedUi(){loadFeatureRecovery();loadChildTemplates();loadCardModels();loadStandaloneCardModels();loadStrictWorkflow();loadStandaloneFold();loadWifiSyncGuard();loadNotificationCorrections();loadSecurity();loadBranchVault();loadDocumentVaultHardening();loadDocumentVaultPermissionGuard();loadEncryptedVaultHardening();loadSettingsCorrections();loadOperationLogCorrections();loadCustomerPermissionsHardening();setTimeout(loadAdminPermissions,180);setTimeout(loadPermissionSectionGuards,280);setTimeout(loadCustomerPermissionsHardening,320)}
  installSplashWatchdog();
  window.AbuBassamDevices={get:current,name:deviceName,ensure:ensureIdentity,heartbeat,list,version:APP_VERSION};window.AbuBassamDeviceName=deviceName;
  window.addEventListener('DOMContentLoaded',()=>{ensureIdentity();loadApprovedUi();signalBootReady();setTimeout(heartbeat,800);setInterval(()=>{if(document.visibilityState!=='hidden')heartbeat()},120000)});
  if(document.readyState!=='loading'){loadApprovedUi();signalBootReady()}
  window.addEventListener('online',heartbeat);document.addEventListener('abu-bassam-auth-changed',()=>{heartbeat();window.AbuBassamSecurity?.onSessionChanged?.()});
})();
