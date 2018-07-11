var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var ex = require('excel');
var express =   require("express");
var multer  =   require('multer');
var app         =   express();
var moment = require('moment');
var dossier = __dirname + "/uploads"
var bodyParser = require('body-parser');
var prefix = "fichier-inventaire-"
const path = require('path');
const fs = require('fs');


var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    callback(null, prefix + moment().unix() + '.xlsx');
  }
});
var upload = multer({ storage : storage}).single('userPhoto');


app.get('/',function(req,res){
      res.sendFile(__dirname + "/inventaire_upload.html");
});


app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
// POST http://localhost:8080/api/users
// parameters sent with
app.post('/api/files', function(req, res) {
    var flag = req.body.flag;
    var listDesFichiers = ls(dossier)
	if(flag == "get-file-list"){
    res.send(JSON.stringify(listDesFichiers) )
		/*effacerlesFichiersNonconform(ls(dossier), function (p) {
      res.send(p)
    });*/
	}

});

const directory = 'uploads';
app.post('/api/photo',function(req,res){
    if (ls(dossier).length > 0) {
      viderLeRepertoire(directory)
    }
    upload(req,res,function(err) {
        if(err) {
            return res.end("Echec envoi fichier.");
        }
        console.log('dernier fichier uploadé: ', req.file)
        console.log( 'total fichiers dans le dossier: ', ls(dossier).length);

        ex.default(dossier + '/' + req.file.filename).then((data) => {
      		// data is an array of arrays
      		var titres = data[0]
      		if(titres[0] == 'id' && titres[1] == 'name' && titres[2] == 'prix_vente' && titres[3] == 'on_hand'){
      			 console.log("le fichier "+dossier + '/' + req.file.filename+" conforme","on le garde")
             var tab = []
             var rep;
             for(var i in data){
              tab.push({"id": data[i][0], "name": data[i][1], "prix_vente": data[i][2], "on_hand": data[i][3]})
             }
             rep = {"items": tab}

             ajouterLesDonneesExtraitesDuFichierExcelALaBdd(rep)
            //res.send(data)
      		}else {
            console.log("le fichier "+dossier + '/' + req.file.filename+" est non conforme");
            // on supprime tout le contenu du repertoire si le fichier uploadé n'est pas conforme
            viderLeRepertoire(directory)
      		}
    		});


      	res.sendFile(__dirname + "/inventaire_dashboard.html");
        //res.end("Envoi du fichier réussi.");
    });

});

app.listen(3000,function(){
    console.log("Working on port 3000");
});



function ajouterLesDonneesExtraitesDuFichierExcelALaBdd(data) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
      var dbo = db.db("htfdb");
      var myquery = { address: 'Mountain 21' };
      // on éfface toute les entrée éxistante précédemment de la BDD
      dbo.collection("inventaire_files").remove(function(err, obj) {
        if (err) throw err;
        console.log("deletion", "ok");
        //db.close();
      });
      dbo.collection("inventaire_files").insertOne(data, function(err, res) {
        if (err) throw err;
        //console.log(res);
        if(res.result.ok == 1) {
          rep = res.insertedId
        }
        db.close();
      });
  });
}


function viderLeRepertoire(directory) {
  console.log('suppréssion des fichiers du repertoire '+ directory);
  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(directory, file), err => {
        if (err) throw err;
      });
    }
  });
}

function ls(dir) {
    var filesystem = require("fs");
    var results = [];

    filesystem.readdirSync(dir).forEach(function(file) {

        file = dir+'/'+file;
        var stat = filesystem.statSync(file);

        if (stat && stat.isDirectory()) {
            results = results.concat(_getAllFilesFromFolder(file))
        } else results.push(file);

    });

    return results;
};

function effacerlesFichiersNonconform (listeDesFichiers, callback) {
	var kept = 0
	var rmvd = 0
	var processed = 0;
	console.log("début vérification des fichiers...")
	for(var i in listeDesFichiers) {
    console.log('traitement du fichier '+path.basename(listeDesFichiers[i])+' ...');
		ex.default(listeDesFichiers[i]).then((data) => {
		// data is an array of arrays
		 var titres = data[0]
		if(titres[0] == 'id' && titres[1] == 'name' && titres[2] == 'prix_vente' && titres[3] == 'on_hand'){
			console.log("le fichier "+path.basename(listeDesFichiers[i])+" conforme","on le garde")
			kept += 1
		}else {
			fs.unlink(dossier+ '/' + path.basename(listeDesFichiers[i]), function(e){
        console.log("le fichier "+path.basename(listeDesFichiers[i])+" est non conforme",e);
        rmvd += 1
      });
		}
		});
	 }

  var int0 = setInterval(function () {
    processed = kept + rmvd
    console.log('processed', processed);
    if (processed == listeDesFichiers.length) {
      clearInterval(int0)
      console.log("vérification des fichiers terminée!");
      if (callback) {
        console.log("envoi de la réponse du server au client...");
        callback(JSON.stringify(ls(dossier)))
      }
    }
  }, 1000);

}

function uniqid() {
  return (new Date().getTime() + Math.floor((Math.random()*10000)+1)).toString(16);
};
