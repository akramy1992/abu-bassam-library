-- Comprehensive owner-managed permission catalog for branch devices.
-- Only boolean values from this catalog may be stored in abu_bassam_devices.permissions.

create or replace function public._abu_bassam_permission_key_allowed(p_key text)
returns boolean
language sql
immutable
set search_path=public
as $$
  select coalesce(p_key,'') = any(array[
    'edit','print','export','appearance','sync','security','devices','reset',
    'deviceView','deviceAdd','deviceRename','deviceEnable','deviceDisable','deviceDelete','deviceLimit','devicePermissions','deviceRole','deviceForceLogout','deviceResetSecret','deviceViewLastSeen','deviceViewModel','deviceAudit','deviceBlockOffline','deviceSetOfflineHours',
    'vaultView','vaultAdd','vaultEdit','vaultRename','vaultMove','vaultFolders','vaultFavorite','vaultDelete','vaultPermanentDelete','vaultRestoreDeleted','vaultPrint','vaultExport','vaultShare','vaultSaveGallery','vaultSavePdf','vaultOcr','vaultImageEdit','vaultCrop','vaultPerspective','vaultEnhance','vaultSync','vaultBackup','vaultRestoreBackup','vaultEncryptedBackup','vaultTransferBranch','vaultViewOtherBranches','vaultDeleteOtherBranch',
    'privateVaultUse','privateVaultAdd','privateVaultView','privateVaultEdit','privateVaultDelete','privateVaultExport','privateVaultBackup','privateVaultRestore','privateVaultChangePassword','privateVaultReset',
    'customerView','customerAdd','customerEdit','customerDelete','customerSearch','customerDocumentsView','customerDocumentsAdd','customerDocumentsEdit','customerDocumentsDelete','customerDocumentsPrint','customerDocumentsExport','customerTransferBranch','customerViewOtherBranches','customerPhoneView','customerSensitiveDataView','customerOriginalDocumentView',
    'cardsView','cardsCreate','cardsEdit','cardsDelete','cardsDuplicate','cardsTemplatesEdit','cardsTemplatesDelete','cardsImportImage','cardsEditImage','cardsEditText','cardsQr','cardsBarcode','cardsPrint','cardsExportImage','cardsExportPdf','cardsA4Layout','cardsSaveTemplate','cardsManageCustomTemplates',
    'questionsView','questionsCreate','questionsEdit','questionsDelete','questionsTemplates','questionsCustomTemplates','questionsAnswersToggle','questionsImages','questionsPrint','questionsPdf','questionsReset','questionsMaintenance',
    'compressUse','compressBatch','compressSave','compressExport','compressHighResolution','compressDeleteOriginal',
    'printGeneral','printDocuments','printCards','printQuestions','printCustomerDocuments','printA4','printCardDirect','printerProfiles','printerCalibration','printerBorderless','printerDpi','printerAdd','printerDelete','printerSetDefault',
    'pdfCreate','pdfSave','pdfShare','excelExport','csvExport','imageExport','bulkExport','exportOutsideApp','shareExternalApps',
    'syncManual','syncAutomatic','syncWifiOnly','syncSettings','backupCreate','backupShare','backupRestore','backupEncrypted','backupDelete','backupOtherBranch','restoreOtherBranch','cloudSettings','googleShare','telegramBackup','whatsappBackup',
    'logsViewOwn','logsViewAllBranches','logsSearch','logsFilter','logsExport','logsPrint','logsPdf','logsDeleteLocal','logsViewCritical','logsViewSecurity','logsViewDeviceActivity',
    'notificationsView','notificationsMarkRead','notificationsDelete','notificationsDeleteCritical','notificationsViewBranches','notificationsManage','notificationsSecurity','notificationsMaintenance','notificationsBackup','notificationsDeviceAlerts',
    'securityView','securityChangePassword','securityBiometric','securityPrivacyMode','securityAutoLock','securityOfflineAccess','securityOfflineDuration','securityForceReauth','securityDeviceSecrets','securitySessions','securityRevokeSessions','securityScreenshot','securityAudit',
    'settingsView','settingsAppearance','settingsThemes','settingsFonts','settingsCardFonts','settingsPrinting','settingsSync','settingsArchive','settingsWhatsApp','settingsTelegram','settingsStorage','settingsPermissions','settingsReset','settingsFactoryReset',
    'adminViewAllBranches','adminOpenBranchReport','adminTransferFiles','adminDisableBranch','adminDisableBranchSync','adminDisableBranchExport','adminDisableBranchPrint','adminDisableBranchDelete','adminForcePasswordChange','adminForceLogout','adminSetOfflineHours','adminLockDeviceNow','adminViewLastSync','adminViewStorageUsage','adminViewFileCount','adminOpenBranchFiles','adminFreezeReadOnly','adminSetViewOnly','adminSetPrintOnly','adminSetDesignOnly','adminSetDocumentsOnly','adminPermissionTemplates','adminBulkApplyPermissions'
  ]::text[]);
$$;

create or replace function public._abu_bassam_permission_admin_only(p_key text)
returns boolean
language sql
immutable
set search_path=public
as $$
  select coalesce(p_key,'') = any(array[
    'deviceView','deviceAdd','deviceRename','deviceEnable','deviceDisable','deviceDelete','deviceLimit','devicePermissions','deviceRole','deviceForceLogout','deviceResetSecret','deviceViewLastSeen','deviceViewModel','deviceAudit','deviceBlockOffline','deviceSetOfflineHours',
    'vaultTransferBranch','vaultViewOtherBranches','vaultDeleteOtherBranch','privateVaultReset','customerTransferBranch','customerViewOtherBranches','backupOtherBranch','restoreOtherBranch','logsViewAllBranches','notificationsViewBranches','settingsFactoryReset','securityDeviceSecrets','securitySessions','securityRevokeSessions',
    'adminViewAllBranches','adminOpenBranchReport','adminTransferFiles','adminDisableBranch','adminDisableBranchSync','adminDisableBranchExport','adminDisableBranchPrint','adminDisableBranchDelete','adminForcePasswordChange','adminForceLogout','adminSetOfflineHours','adminLockDeviceNow','adminViewLastSync','adminViewStorageUsage','adminViewFileCount','adminOpenBranchFiles','adminFreezeReadOnly','adminSetViewOnly','adminSetPrintOnly','adminSetDesignOnly','adminSetDocumentsOnly','adminPermissionTemplates','adminBulkApplyPermissions'
  ]::text[]);
$$;

revoke all on function public._abu_bassam_permission_key_allowed(text) from public,anon,authenticated;
revoke all on function public._abu_bassam_permission_admin_only(text) from public,anon,authenticated;

create or replace function public.abu_bassam_manage_device(
  p_actor_device_id text,
  p_actor_secret text,
  p_target_device_id text,
  p_device_name text default null,
  p_active boolean default null,
  p_permissions jsonb default null
) returns public.abu_bassam_devices
language plpgsql
security definer
set search_path to 'public','extensions'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_actor public.abu_bassam_devices%rowtype;
  v_target public.abu_bassam_devices%rowtype;
  v_hash text;
  v_key text;
  v_value jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_actor_device_id),'')='' or coalesce(p_actor_secret,'')='' then raise exception 'OWNER_REQUIRED'; end if;
  v_hash:=encode(digest(p_actor_secret,'sha256'),'hex');
  select * into v_actor from public.abu_bassam_devices where user_id=v_uid and device_id=p_actor_device_id limit 1;
  if not found or v_actor.role<>'owner' or v_actor.active=false or coalesce(v_actor.secret_hash,'')='' or v_actor.secret_hash<>v_hash then
    raise exception 'OWNER_REQUIRED';
  end if;
  select * into v_target from public.abu_bassam_devices where user_id=v_uid and device_id=p_target_device_id limit 1;
  if not found then raise exception 'DEVICE_NOT_FOUND'; end if;
  if p_target_device_id=p_actor_device_id and p_active=false then raise exception 'OWNER_CANNOT_BE_DISABLED'; end if;
  if p_permissions is not null then
    if v_target.role='owner' then raise exception 'OWNER_PERMISSIONS_IMMUTABLE'; end if;
    if jsonb_typeof(p_permissions)<>'object' then raise exception 'PERMISSIONS_INVALID'; end if;
    if jsonb_object_length(p_permissions)>220 then raise exception 'PERMISSIONS_TOO_LARGE'; end if;
    for v_key,v_value in select key,value from jsonb_each(p_permissions) loop
      if not public._abu_bassam_permission_key_allowed(v_key) then raise exception 'PERMISSION_KEY_NOT_ALLOWED:%',v_key; end if;
      if jsonb_typeof(v_value)<>'boolean' then raise exception 'PERMISSION_VALUE_INVALID:%',v_key; end if;
      if public._abu_bassam_permission_admin_only(v_key) and (v_value#>>'{}')::boolean then
        raise exception 'ADMIN_ONLY_PERMISSION:%',v_key;
      end if;
    end loop;
  end if;
  update public.abu_bassam_devices
     set device_name=coalesce(nullif(trim(p_device_name),''),device_name),
         active=coalesce(p_active,active),
         permissions=coalesce(p_permissions,permissions)
   where user_id=v_uid and device_id=p_target_device_id
   returning * into v_target;
  return v_target;
end $function$;

revoke all on function public.abu_bassam_manage_device(text,text,text,text,boolean,jsonb) from public,anon;
grant execute on function public.abu_bassam_manage_device(text,text,text,text,boolean,jsonb) to authenticated;
