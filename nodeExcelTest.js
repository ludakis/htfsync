//import parseXlsx from 'excel';
var ex = require('excel');

ex.default('fichier-inventaire-1529965005.xlsx').then((data) => {
// data is an array of arrays
 var titres = data[0]
 var tab = []
 var rep;
 for(var i in data){
  tab.push({"id": data[i][0], "name": data[i][1], "prix_vente": data[i][2], "on_hand": data[i][3]})
 }
 rep = {"items": tab}
 
 console.log(rep.items[1000])
 return rep
 
});
