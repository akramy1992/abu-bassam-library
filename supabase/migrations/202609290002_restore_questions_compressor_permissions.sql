-- Restore permission keys for the Questions and Image Compressor sections.
-- Forward-only correction: do not mutate or delete the historical retire migration.
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
    'printGeneral','printDocuments','printCards','printCustomerDocuments','printQuestions','printA4','printCardDirect','printerProfiles','printerCalibration','printerBorderless','printerDpi','printerAdd','printerDelete','printerSetDefault',
    'pdfCreate','pdfSave','pdfShare','excelExport','csvExport','imageExport','bulkExport','exportOutsideApp','shareExternalApps',
    'syncManual','syncAutomatic','syncWifiOnly','syncSettings','backupCreate','backupShare','backupRestore','backupEncrypted','backupDelete','backupOtherBranch','restoreOtherBranch','cloudSettings','googleShare','telegramBackup','whatsappBackup',
    'logsViewOwn','logsViewAllBranches','logsSearch','logsFilter','logsExport','logsPrint','logsPdf','logsDeleteLocal','logsViewCritical','logsViewSecurity','logsViewDeviceActivity',
    'notificationsView','notificationsMarkRead','notificationsDelete','notificationsDeleteCritical','notificationsViewBranches','notificationsManage','notificationsSecurity','notificationsMaintenance','notificationsBackup','notificationsDeviceAlerts',
    'securityView','securityChangePassword','securityBiometric','securityPrivacyMode','securityAutoLock','securityOfflineAccess','securityOfflineDuration','securityForceReauth','securityDeviceSecrets','securitySessions','securityRevokeSessions','securityScreenshot','securityAudit',
    'settingsView','settingsAppearance','settingsThemes','settingsFonts','settingsCardFonts','settingsPrinting','settingsSync','settingsArchive','settingsWhatsApp','settingsTelegram','settingsStorage','settingsPermissions','settingsReset','settingsFactoryReset',
    'adminViewAllBranches','adminOpenBranchReport','adminTransferFiles','adminDisableBranch','adminDisableBranchSync','adminDisableBranchExport','adminDisableBranchPrint','adminDisableBranchDelete','adminForcePasswordChange','adminForceLogout','adminSetOfflineHours','adminLockDeviceNow','adminViewLastSync','adminViewStorageUsage','adminViewFileCount','adminOpenBranchFiles','adminFreezeReadOnly','adminSetViewOnly','adminSetPrintOnly','adminSetDesignOnly','adminSetDocumentsOnly','adminPermissionTemplates','adminBulkApplyPermissions'
  ]::text[]);
$$;

-- Existing secondary-device permission JSON is intentionally not auto-granted.
-- Owners retain owner bypass; administrators can explicitly enable restored keys per device.
revoke all on function public._abu_bassam_permission_key_allowed(text) from public,anon,authenticated;
