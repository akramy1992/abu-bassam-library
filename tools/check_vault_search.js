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
assert.equal(search.matches(sample,'تأييد'),'true'==='true');
assert.equal(search.matches(sample,'الرعايه'),'true'==='true');
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
assert.ok(shell.indexOf('vault-search-utils.js')<shell.indexOf('document-vault-runtime.js'));
assert.ok(vault.includes('AbuBassamVaultSearch.matches(item,query)') || vault.includes('search.matches(item,query)'));
assert.ok(vault.includes('function clearSearch()'));
assert.ok(vault.includes('clearTimeout(searchRenderTimer)'));
console.log('Vault Arabic offline search: normalization, query operators, phone matching, privacy surface, wiring assertions passed');
