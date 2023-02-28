// this index.js file as per definition in the package.json, is the 
// main landing file for our nodejs project. So, all of the other modules
// that we might create as part of this node project would all get
// exported into this file. We would export all of those modules to the
// module.exports global namespace and we will import that global
// namespace here and make it available to the package.json. So, whenever
// the node project starts those modules will be available together
// as part of the global namespace for node.js. 

//The global namespace of all the files will be imported into the index.js file.
'use strict';

const propertyregContractUsers = require('./users.js');
const propertyregContractRegistrar = require('./registrar.js');

//module.exports.propertyregContractUsers = propertyregContractUsers;
//module.exports.propertyregContractRegistrar = propertyregContractRegistrar;
module.exports.contracts = [propertyregContractUsers, propertyregContractRegistrar]; 
//NOTE, this is an array of various nodejs modules/contracts that we have included as part of this file.