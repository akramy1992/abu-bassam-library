'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const search=require('../web/vault-search-utils.js');

const source=path.join(__dirname,'../web/document-vault-runtime.js');
const shell=fs.readFileSync(path.join(__dirname,'../web/index.html'),'utf8');
const vault=fs.readFileSync(source,'utf8');
const sample={
  name:'كِتاب تأييد مدرسة القادسية رقم ۱۲٥.pdf',
  folder:'الرعاية الاجتماعية',
  notes:'هاتف المراجع: +964 782 966 7521',
  mime:'application/pdf',
  documentNumber:'١٢٥',
  deleted:false
};

assert.equal(search.normalize('إِكْرَام ۱۲٣'),'اكرام 123');
assert.equal(search.normalize('مَدْرَسَة'),'مدرسه');
assert.equal(search.phone('07829667521'),'07829667521');
assert.equal(search.phone('+9647829667521'),'07829667521');
assert.equal(search.phone('009647829667521'),'07829667521');
assert.equal(search.phone('12345'),'');
assert.equal(search.matches(sample,'تأييد'),true);
assert.equal(search.matches(sample,'الرعايه'),true);
assert.equal(search.matches(sample,'125'),true);
assert.equal(search.matches(sample,'"مدرسة القادسية"'),true);
assert.equal(search.matches(sample,'+9647829667521'),true);
assert.equal(search.matches(sample,'07829667521'),true);
assert.equal(search.matches(sample,'تأييد -الرعاية'),false);
assert.equal(search.matches(sample,'تأييد -المحكمه'),true);
assert.equal(search.matches(sample,'تأييد مدرسة'),true);
assert.equal(search.matches(sample,'تأييد لايوجد'),false);
assert.equal(search.matches({name:'أسئلة',token:'SECRET_VALUE'},'SECRET_VALUE'),false);
assert.equal(search.matches({name:'هوية',deleted:true},'هوية'),true,'Filtering deleted items remains the responsibility of the vault query');
const metadata={
  name:'كتاب تأييد القادسية',
  documentNumber:'١٢٥',
  size:2048,
  updatedAt:'2026-10-10T17:00:00.000Z',
  createdAt:'2026-10-08T09:00:00.000Z'
};
assert.equal(search.filterMetadata(metadata,{documentNumber:'125'}),true);
assert.equal(search.filterMetadata(metadata,{documentNumber:'126'}),false);
assert.equal(search.filterMetadata(metadata,{documentNumber:'125',minKb:'2',maxKb:'2'}),true);
assert.equal(search.filterMetadata(metadata,{minKb:'3'}),false);
assert.equal(search.filterMetadata(metadata,{maxKb:'1'}),false);
assert.equal(search.filterMetadata(metadata,{minKb:'3',maxKb:'1'}),false);
assert.equal(search.filterMetadata({...metadata,size:null},{minKb:'1'}),false);
assert.equal(search.filterMetadata({...metadata,deleted:true},{}),false);
assert.equal(search.filterMetadata({...metadata,token:'125',documentNumber:''},{documentNumber:'125'}),false);
assert.equal(search.filterMetadata(metadata,{updatedFrom:'2026-10-10',updatedTo:'2026-10-10'}),true);
assert.equal(search.filterMetadata(metadata,{updatedFrom:'2026-10-11'}),false);
assert.equal(search.filterMetadata(metadata,{updatedTo:'2026-10-09'}),false);
assert.equal(search.filterMetadata(metadata,{createdFrom:'2026-10-08',createdTo:'2026-10-08'}),true);
assert.equal(search.filterMetadata(metadata,{updatedFrom:'2026-02-31'}),false);
assert.equal(search.filterMetadata(metadata,{minKb:'oops'}),false);
// Reuse existing type/folder tabs rather than registering duplicate UI handlers.
assert.equal((vault.match(/function setSearchDetail\(/g)||[]).length,1);
assert.equal((vault.match(/data-vault-search-detail="documentNumber"/g)||[]).length,1);
assert.ok(vault.includes('search?.filterMetadata?.(item,details)'));
assert.ok(vault.includes('matchesFilter(item)&&matchesQuery(item)&&detailsMatch(item)'));
assert.ok(vault.includes("document.querySelectorAll('[data-vault-search-detail]')"));
assert.ok(vault.includes("data-filter=\"folder:المستمسكات\""));

assert.ok(shell.indexOf('vault-search-utils.js')<shell.indexOf('document-vault-runtime.js'));
assert.ok(vault.includes('AbuBassamVaultSearch.matches(item,query)') || vault.includes('search.matches(item,query)'));
assert.ok(vault.includes('function clearSearch()'));
assert.ok(vault.includes('clearTimeout(searchRenderTimer)'));
console.log('Vault Arabic offline search: normalization, query operators, phone matching, privacy surface, wiring assertions passed');
