(()=>{
'use strict';
if(window.__ABU_PRODUCTIVITY_TOOLS_V6__)return;
window.__ABU_PRODUCTIVITY_TOOLS_V6__=true;
function loadOne(id,src,flag){if(window[flag]||document.getElementById(id))return;const script=document.createElement('script');script.id=id;script.src=src;script.async=false;script.onerror=()=>console.warn(src+' failed to load');document.body.appendChild(script)}
function loadCoreTools(){
  loadOne('abuPhotoPrintAdvancedRuntime','photo-print-advanced-runtime.js','__ABU_PHOTO_PRINT_ADVANCED_V1__');
  loadOne('abuPhotoGeometryRuntime','photo-geometry-runtime.js','__ABU_PHOTO_GEOMETRY_V1__');
  loadOne('abuPrintPresetsRuntime','print-presets-runtime.js','__ABU_PRINT_PRESETS_V1__');
  loadOne('abuCardFreeLayoutRuntime','card-free-layout-runtime.js','__ABU_CARD_FREE_LAYOUT_V1__');
  loadOne('abuCardModelsPlusRuntime','card-models-plus-runtime.js','__ABU_CARD_MODELS_PLUS_V1__');
  loadOne('abuCardsSectionUpgradesRuntime','cards-section-upgrades-runtime.js','__ABU_CARDS_SECTION_UPGRADES_V1__');
  loadOne('abuStandaloneCardLayoutsPlusRuntime','standalone-card-layouts-plus-runtime.js','__ABU_STANDALONE_CARD_LAYOUTS_PLUS_V1__');
  loadOne('abuA4CardSheetEditorV2Runtime','a4-card-sheet-editor-v2-runtime.js','__ABU_A4_CARD_SHEET_EDITOR_V2__');
  loadOne('abuPosterProjectRuntime','poster-project-runtime.js','__ABU_POSTER_PROJECT_V1__');
  loadOne('abuSettingsEnhancementsRuntime','settings-enhancements-runtime.js','__ABU_SETTINGS_ENHANCEMENTS_V1__');
  loadOne('abuOperationLogPrivacyRuntime','operation-log-privacy-runtime.js','__ABU_OPERATION_LOG_PRIVACY_V1__');
  loadOne('abuNotificationCenterRuntime','notification-center-runtime.js','__ABU_NOTIFICATION_CENTER_V1__');
  loadOne('abuNotificationOpsBridgeRuntime','notification-ops-bridge-runtime.js','__ABU_NOTIFICATION_OPS_BRIDGE_V1__');
  loadOne('abuDocumentVaultAdvancedRuntime','document-vault-advanced-runtime.js','__ABU_DOCUMENT_VAULT_ADVANCED_V1__');
  loadOne('abuDocumentVaultOfflineOcrRuntime','document-vault-offline-ocr-runtime.js','__ABU_DOCUMENT_VAULT_OFFLINE_OCR_V1__');
  loadOne('abuDocumentVaultEncryptedRuntime','document-vault-encrypted-runtime.js','__ABU_DOCUMENT_VAULT_ENCRYPTED_V1__');
  loadOne('abuCustomerDocumentsRuntime','customer-documents-runtime.js','__ABU_CUSTOMER_DOCS_V3__');
  loadOne('abuCustomerCameraFrameRuntime','customer-camera-frame-runtime.js','__ABU_CUSTOMER_FRAME_BRIDGE_V1__');
  loadOne('abuCustomerWorkflowRuntime','customer-documents-workflow-runtime.js','__ABU_CUSTOMER_WORKFLOW_V2__');
  loadOne('abuCustomerImageQualityRuntime','customer-image-quality-runtime.js','__ABU_CUSTOMER_IMAGE_QUALITY_V1__');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCoreTools,{once:true});else loadCoreTools();
})();
